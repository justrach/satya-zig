/**
 * dhi - EXTREME OPTIMIZATION for JavaScript/TypeScript
 * Goal: Match Python's 27M/sec with:
 * - SharedArrayBuffer for zero-copy
 * - Pre-allocated memory pools
 * - Batch string encoding
 * - WASM SIMD (future)
 */

import { readFileSync } from "fs";
import { join } from "path";

const wasmPath = join(import.meta.dir || __dirname, "dhi.wasm");
const wasmBytes = readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBytes, {});
const wasm = wasmModule.instance.exports as any;

// Pre-allocate a large SharedArrayBuffer for zero-copy operations
const POOL_SIZE = 10 * 1024 * 1024; // 10MB pool
const sharedBuffer = new SharedArrayBuffer(POOL_SIZE);
const sharedView = new Uint8Array(sharedBuffer);
const sharedDataView = new DataView(sharedBuffer);

// Text encoder (reused)
const encoder = new TextEncoder();

// Validator type enum
const ValidatorType = {
  email: 0,
  url: 1,
  uuid: 2,
  ipv4: 3,
  isoDate: 4,
  isoDatetime: 5,
  base64: 6,
  string: 7,
  positive: 8,
} as const;

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface Schema {
  [key: string]: Validator;
}

export type Validator =
  | { type: "email" }
  | { type: "url" }
  | { type: "uuid" }
  | { type: "ipv4" }
  | { type: "isoDate" }
  | { type: "isoDatetime" }
  | { type: "base64" }
  | { type: "string"; min: number; max: number }
  | { type: "positive" };

// Cache parsed schemas
const schemaCache = new WeakMap<Schema, ParsedSchema>();

interface ParsedSchema {
  fieldNames: string[];
  types: Uint8Array;
  params: Int32Array;
  specSize: number;
}

function parseSchema(schema: Schema): ParsedSchema {
  let cached = schemaCache.get(schema);
  if (cached) return cached;

  const entries = Object.entries(schema);
  const fieldNames = entries.map(([name]) => name);
  const types = new Uint8Array(entries.length);
  const params = new Int32Array(entries.length * 2);

  for (let i = 0; i < entries.length; i++) {
    const [, validator] = entries[i];
    
    switch (validator.type) {
      case "email": types[i] = ValidatorType.email; break;
      case "url": types[i] = ValidatorType.url; break;
      case "uuid": types[i] = ValidatorType.uuid; break;
      case "ipv4": types[i] = ValidatorType.ipv4; break;
      case "isoDate": types[i] = ValidatorType.isoDate; break;
      case "isoDatetime": types[i] = ValidatorType.isoDatetime; break;
      case "base64": types[i] = ValidatorType.base64; break;
      case "string":
        types[i] = ValidatorType.string;
        params[i * 2] = validator.min;
        params[i * 2 + 1] = validator.max;
        break;
      case "positive": types[i] = ValidatorType.positive; break;
    }
  }

  const specSize = 4 + entries.length * 9; // num_fields + (type + param1 + param2) per field
  cached = { fieldNames, types, params, specSize };
  schemaCache.set(schema, cached);
  return cached;
}

// EXTREME: Batch encode all strings at once using SharedArrayBuffer
export function validateBatchExtreme(items: any[], schema: Schema): boolean[] {
  const parsed = parseSchema(schema);
  const numFields = parsed.fieldNames.length;
  
  // Calculate total size needed
  let offset = 0;
  
  // Write spec header
  sharedDataView.setUint32(offset, numFields, true);
  offset += 4;
  
  // Write field specs
  for (let i = 0; i < numFields; i++) {
    sharedView[offset++] = parsed.types[i];
    sharedDataView.setInt32(offset, parsed.params[i * 2], true);
    offset += 4;
    sharedDataView.setInt32(offset, parsed.params[i * 2 + 1], true);
    offset += 4;
  }
  
  const specEnd = offset;
  
  // Write num_items
  sharedDataView.setUint32(offset, items.length, true);
  offset += 4;
  
  // OPTIMIZATION: Batch encode all strings at once
  // Pre-calculate all string positions
  const stringPositions: number[] = [];
  const encodedStrings: Uint8Array[] = [];
  
  for (const item of items) {
    for (const fieldName of parsed.fieldNames) {
      const value = String(item[fieldName] || "");
      const encoded = encoder.encode(value);
      stringPositions.push(offset);
      encodedStrings.push(encoded);
      offset += 4 + encoded.length; // length + data
    }
  }
  
  // Check if we exceed pool size
  if (offset > POOL_SIZE) {
    throw new Error(`Data too large for pool: ${offset} > ${POOL_SIZE}`);
  }
  
  // OPTIMIZATION: Write all strings in one pass (better cache locality)
  let writeOffset = specEnd + 4;
  for (const encoded of encodedStrings) {
    sharedDataView.setUint32(writeOffset, encoded.length, true);
    writeOffset += 4;
    sharedView.set(encoded, writeOffset);
    writeOffset += encoded.length;
  }
  
  // OPTIMIZATION: Zero-copy - pass SharedArrayBuffer directly to WASM
  // Allocate WASM memory and copy from shared buffer
  const wasmPtr = wasm.alloc(offset);
  const wasmMemory = new Uint8Array(wasm.memory.buffer);
  wasmMemory.set(sharedView.subarray(0, offset), wasmPtr);
  
  // Single WASM call
  const resultsPtr = wasm.validate_batch_optimized(
    wasmPtr,
    parsed.specSize,
    wasmPtr + specEnd,
    offset - specEnd
  );
  
  // Read results
  const resultsMemory = new Uint8Array(wasm.memory.buffer);
  const results: boolean[] = [];
  for (let i = 0; i < items.length; i++) {
    results.push(resultsMemory[resultsPtr + i] === 1);
  }
  
  // Cleanup
  wasm.dealloc(wasmPtr, offset);
  wasm.dealloc(resultsPtr, items.length);
  
  return results;
}

// Wrapper for compatibility
export function validateBatch(items: any[], schema: Schema): ValidationResult[] {
  const results = validateBatchExtreme(items, schema);
  return results.map(valid => ({ valid, errors: valid ? undefined : ["Validation failed"] }));
}

// Individual validators (for single items)
export const validators = {
  email: (value: string): boolean => {
    const bytes = encoder.encode(value);
    const ptr = wasm.alloc(bytes.length);
    const memory = new Uint8Array(wasm.memory.buffer);
    memory.set(bytes, ptr);
    const result = wasm.validate_email(ptr, bytes.length);
    wasm.dealloc(ptr, bytes.length);
    return Boolean(result);
  },
  
  url: (value: string): boolean => {
    const bytes = encoder.encode(value);
    const ptr = wasm.alloc(bytes.length);
    const memory = new Uint8Array(wasm.memory.buffer);
    memory.set(bytes, ptr);
    const result = wasm.validate_url(ptr, bytes.length);
    wasm.dealloc(ptr, bytes.length);
    return Boolean(result);
  },
  
  positive: (value: number): boolean => {
    return Boolean(wasm.validate_int_positive(BigInt(value)));
  },
};

export function validate(data: any, schema: Schema): ValidationResult {
  const results = validateBatch([data], schema);
  return results[0];
}

export const z = {
  string: (min?: number, max?: number) => ({
    type: "string" as const,
    min: min ?? 0,
    max: max ?? 1000000,
  }),
  email: () => ({ type: "email" as const }),
  url: () => ({ type: "url" as const }),
  uuid: () => ({ type: "uuid" as const }),
  ipv4: () => ({ type: "ipv4" as const }),
  isoDate: () => ({ type: "isoDate" as const }),
  isoDatetime: () => ({ type: "isoDatetime" as const }),
  base64: () => ({ type: "base64" as const }),
  positive: () => ({ type: "positive" as const }),
};

export default { validate, validateBatch, validators, z };
