/**
 * dhi - ULTRA-OPTIMIZED for JavaScript/TypeScript
 * Goal: Match Python's 27M/sec performance
 */

import { readFileSync } from "fs";
import { join } from "path";

const wasmPath = join(import.meta.dir || __dirname, "dhi.wasm");
const wasmBytes = readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBytes, {});
const wasm = wasmModule.instance.exports as any;

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

  cached = { fieldNames, types, params };
  schemaCache.set(schema, cached);
  return cached;
}

// ULTRA-OPTIMIZED: Serialize everything to binary, single WASM call
export function validateBatchUltra(items: any[], schema: Schema): boolean[] {
  const parsed = parseSchema(schema);
  const numFields = parsed.fieldNames.length;
  
  // Pre-calculate total size needed
  let totalSize = 8; // num_fields (4) + num_items (4)
  totalSize += numFields * 9; // type (1) + param1 (4) + param2 (4) per field
  
  // Encode all strings once
  const encodedData: Uint8Array[][] = [];
  for (const item of items) {
    const itemData: Uint8Array[] = [];
    for (const fieldName of parsed.fieldNames) {
      const value = String(item[fieldName] || "");
      const encoded = encoder.encode(value);
      itemData.push(encoded);
      totalSize += 4 + encoded.length; // length + data
    }
    encodedData.push(itemData);
  }
  
  // Build single buffer with everything
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);
  let offset = 0;
  
  // Write num_fields
  view.setUint32(offset, numFields, true);
  offset += 4;
  
  // Write field specs
  for (let i = 0; i < numFields; i++) {
    buffer[offset++] = parsed.types[i];
    view.setInt32(offset, parsed.params[i * 2], true);
    offset += 4;
    view.setInt32(offset, parsed.params[i * 2 + 1], true);
    offset += 4;
  }
  
  // Write num_items
  view.setUint32(offset, items.length, true);
  offset += 4;
  
  // Write all item data
  for (const itemData of encodedData) {
    for (const fieldData of itemData) {
      view.setUint32(offset, fieldData.length, true);
      offset += 4;
      buffer.set(fieldData, offset);
      offset += fieldData.length;
    }
  }
  
  // Single WASM call
  const bufferPtr = wasm.alloc(buffer.length);
  const memory = new Uint8Array(wasm.memory.buffer);
  memory.set(buffer, bufferPtr);
  
  const resultsPtr = wasm.validate_batch_optimized(
    bufferPtr,
    numFields * 9 + 4,
    bufferPtr + numFields * 9 + 4,
    buffer.length - numFields * 9 - 4
  );
  
  // Read results
  const resultsMemory = new Uint8Array(wasm.memory.buffer);
  const results: boolean[] = [];
  for (let i = 0; i < items.length; i++) {
    results.push(resultsMemory[resultsPtr + i] === 1);
  }
  
  // Cleanup
  wasm.dealloc(bufferPtr, buffer.length);
  wasm.dealloc(resultsPtr, items.length);
  
  return results;
}

// Wrapper for compatibility
export function validateBatch(items: any[], schema: Schema): ValidationResult[] {
  const results = validateBatchUltra(items, schema);
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
