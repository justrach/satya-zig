/**
 * dhi - Ultra-Fast Data Validation for JavaScript/TypeScript
 * Universal WASM implementation - works in Node.js, Bun, Deno, and browsers!
 */

import { readFileSync } from "fs";
import { join } from "path";

// Load WASM module
const wasmPath = join(import.meta.dir || __dirname, "dhi.wasm");
const wasmBytes = readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBytes, {});
const wasm = wasmModule.instance.exports as any;

// Text encoder/decoder for string handling
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Helper to pass strings to WASM
function passString(str: string): { ptr: number; len: number } {
  const bytes = encoder.encode(str);
  const ptr = wasm.alloc(bytes.length);
  const memory = new Uint8Array(wasm.memory.buffer);
  memory.set(bytes, ptr);
  return { ptr, len: bytes.length };
}

function freeString(ptr: number, len: number) {
  wasm.dealloc(ptr, len);
}

// Validator functions
export const validators = {
  email: (value: string): boolean => {
    const { ptr, len } = passString(value);
    const result = wasm.validate_email(ptr, len);
    freeString(ptr, len);
    return Boolean(result);
  },

  url: (value: string): boolean => {
    const { ptr, len } = passString(value);
    const result = wasm.validate_url(ptr, len);
    freeString(ptr, len);
    return Boolean(result);
  },

  uuid: (value: string): boolean => {
    const { ptr, len } = passString(value);
    const result = wasm.validate_uuid(ptr, len);
    freeString(ptr, len);
    return Boolean(result);
  },

  ipv4: (value: string): boolean => {
    const { ptr, len } = passString(value);
    const result = wasm.validate_ipv4(ptr, len);
    freeString(ptr, len);
    return Boolean(result);
  },

  string: (value: string, min: number, max: number): boolean => {
    const { ptr, len } = passString(value);
    const result = wasm.validate_string_length(ptr, len, min, max);
    freeString(ptr, len);
    return Boolean(result);
  },

  isoDate: (value: string): boolean => {
    const { ptr, len } = passString(value);
    const result = wasm.validate_iso_date(ptr, len);
    freeString(ptr, len);
    return Boolean(result);
  },

  isoDatetime: (value: string): boolean => {
    const { ptr, len } = passString(value);
    const result = wasm.validate_iso_datetime(ptr, len);
    freeString(ptr, len);
    return Boolean(result);
  },

  base64: (value: string): boolean => {
    const { ptr, len } = passString(value);
    const result = wasm.validate_base64(ptr, len);
    freeString(ptr, len);
    return Boolean(result);
  },

  int: (value: number, min: number = -2147483648, max: number = 2147483647): boolean => {
    return Boolean(wasm.validate_int(BigInt(value), BigInt(min), BigInt(max)));
  },

  intGt: (value: number, min: number): boolean => {
    return Boolean(wasm.validate_int_gt(BigInt(value), BigInt(min)));
  },

  intGte: (value: number, min: number): boolean => {
    return Boolean(wasm.validate_int_gte(BigInt(value), BigInt(min)));
  },

  intLt: (value: number, max: number): boolean => {
    return Boolean(wasm.validate_int_lt(BigInt(value), BigInt(max)));
  },

  intLte: (value: number, max: number): boolean => {
    return Boolean(wasm.validate_int_lte(BigInt(value), BigInt(max)));
  },

  positive: (value: number): boolean => {
    return Boolean(wasm.validate_int_positive(BigInt(value)));
  },

  nonNegative: (value: number): boolean => {
    return Boolean(wasm.validate_int_non_negative(BigInt(value)));
  },

  multipleOf: (value: number, divisor: number): boolean => {
    return Boolean(wasm.validate_int_multiple_of(BigInt(value), BigInt(divisor)));
  },

  floatGt: (value: number, min: number): boolean => {
    return Boolean(wasm.validate_float_gt(value, min));
  },

  floatFinite: (value: number): boolean => {
    return Boolean(wasm.validate_float_finite(value));
  },
};

// Type definitions
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
  | { type: "int"; min?: number; max?: number }
  | { type: "positive" }
  | { type: "nonNegative" };

// Schema validation
export function validate(data: any, schema: Schema): ValidationResult {
  const errors: string[] = [];

  for (const [key, validator] of Object.entries(schema)) {
    const value = data[key];

    if (value === undefined) {
      errors.push(`Missing field: ${key}`);
      continue;
    }

    let valid = false;

    switch (validator.type) {
      case "email":
        valid = validators.email(value);
        if (!valid) errors.push(`${key}: Invalid email`);
        break;

      case "url":
        valid = validators.url(value);
        if (!valid) errors.push(`${key}: Invalid URL`);
        break;

      case "uuid":
        valid = validators.uuid(value);
        if (!valid) errors.push(`${key}: Invalid UUID`);
        break;

      case "ipv4":
        valid = validators.ipv4(value);
        if (!valid) errors.push(`${key}: Invalid IPv4`);
        break;

      case "isoDate":
        valid = validators.isoDate(value);
        if (!valid) errors.push(`${key}: Invalid ISO date`);
        break;

      case "isoDatetime":
        valid = validators.isoDatetime(value);
        if (!valid) errors.push(`${key}: Invalid ISO datetime`);
        break;

      case "base64":
        valid = validators.base64(value);
        if (!valid) errors.push(`${key}: Invalid base64`);
        break;

      case "string":
        valid = validators.string(value, validator.min, validator.max);
        if (!valid)
          errors.push(`${key}: String length must be ${validator.min}-${validator.max}`);
        break;

      case "int":
        valid = validators.int(value, validator.min, validator.max);
        if (!valid) errors.push(`${key}: Integer must be ${validator.min}-${validator.max}`);
        break;

      case "positive":
        valid = validators.positive(value);
        if (!valid) errors.push(`${key}: Must be positive`);
        break;

      case "nonNegative":
        valid = validators.nonNegative(value);
        if (!valid) errors.push(`${key}: Must be non-negative`);
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Batch validation
export function validateBatch(items: any[], schema: Schema): ValidationResult[] {
  return items.map((item) => validate(item, schema));
}

// Zod-like API
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

  number: (min?: number, max?: number) => ({
    type: "int" as const,
    min,
    max,
  }),

  positive: () => ({ type: "positive" as const }),
  nonNegative: () => ({ type: "nonNegative" as const }),
};

// Export for convenience
export default { validate, validateBatch, validators, z };
