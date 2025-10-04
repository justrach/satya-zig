/**
 * dhi - ULTRA-FAST Schema API
 * Optimized to beat Zod with aggressive inlining
 */

import { readFileSync } from "fs";
import { join } from "path";

const wasmPath = join(import.meta.dir || __dirname, "dhi.wasm");
const wasmBytes = readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBytes, {});
const wasm = wasmModule.instance.exports as any;

const encoder = new TextEncoder();

// Types
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { issues: Array<{ path: (string | number)[]; message: string; code: string }> } };

// Base Schema with inline optimization
export abstract class Schema<T = any> {
  abstract _validate(value: any, path: (string | number)[]): ValidationResult<T>;
  
  parse(value: any): T {
    const result = this._validate(value, []);
    if (!result.success) throw new Error(`Validation failed`);
    return result.data;
  }
  
  safeParse(value: any): ValidationResult<T> {
    return this._validate(value, []);
  }
}

// ULTRA-FAST String Schema - everything inlined
export class StringSchema extends Schema<string> {
  private _min?: number;
  private _max?: number;
  private _email = false;
  
  min(length: number): this { this._min = length; return this; }
  max(length: number): this { this._max = length; return this; }
  email(): this { this._email = true; return this; }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<string> {
    // INLINE: Type check
    if (typeof value !== 'string') {
      return { success: false, error: { issues: [{ path, message: 'Expected string', code: 'invalid_type' }] } };
    }
    
    // INLINE: Length checks (fastest path)
    const len = value.length;
    if (this._min !== undefined && len < this._min) {
      return { success: false, error: { issues: [{ path, message: 'Too short', code: 'too_small' }] } };
    }
    if (this._max !== undefined && len > this._max) {
      return { success: false, error: { issues: [{ path, message: 'Too long', code: 'too_big' }] } };
    }
    
    // Email validation (only if needed)
    if (this._email) {
      const bytes = encoder.encode(value);
      const ptr = wasm.alloc(bytes.length);
      new Uint8Array(wasm.memory.buffer).set(bytes, ptr);
      const valid = wasm.validate_email(ptr, bytes.length);
      wasm.dealloc(ptr, bytes.length);
      if (!valid) {
        return { success: false, error: { issues: [{ path, message: 'Invalid email', code: 'invalid_string' }] } };
      }
    }
    
    return { success: true, data: value };
  }
}

// ULTRA-FAST Number Schema - everything inlined
export class NumberSchema extends Schema<number> {
  private _min?: number;
  private _max?: number;
  private _positive = false;
  private _int = false;
  
  min(value: number): this { this._min = value; return this; }
  max(value: number): this { this._max = value; return this; }
  positive(): this { this._positive = true; return this; }
  int(): this { this._int = true; return this; }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<number> {
    // INLINE: Everything for maximum speed
    if (typeof value !== 'number') {
      return { success: false, error: { issues: [{ path, message: 'Expected number', code: 'invalid_type' }] } };
    }
    if (this._int && !Number.isInteger(value)) {
      return { success: false, error: { issues: [{ path, message: 'Expected integer', code: 'invalid_type' }] } };
    }
    if (this._positive && value <= 0) {
      return { success: false, error: { issues: [{ path, message: 'Must be positive', code: 'too_small' }] } };
    }
    if (this._min !== undefined && value < this._min) {
      return { success: false, error: { issues: [{ path, message: 'Too small', code: 'too_small' }] } };
    }
    if (this._max !== undefined && value > this._max) {
      return { success: false, error: { issues: [{ path, message: 'Too big', code: 'too_big' }] } };
    }
    
    return { success: true, data: value };
  }
}

// ULTRA-FAST Boolean Schema
export class BooleanSchema extends Schema<boolean> {
  _validate(value: any, path: (string | number)[]): ValidationResult<boolean> {
    return typeof value === 'boolean'
      ? { success: true, data: value }
      : { success: false, error: { issues: [{ path, message: 'Expected boolean', code: 'invalid_type' }] } };
  }
}

// ULTRA-FAST Enum Schema with Set lookup
export class EnumSchema<T extends string> extends Schema<T> {
  private _set: Set<string>;
  
  constructor(private values: readonly T[]) {
    super();
    this._set = new Set(values);
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    return this._set.has(value)
      ? { success: true, data: value }
      : { success: false, error: { issues: [{ path, message: 'Invalid enum value', code: 'invalid_enum_value' }] } };
  }
}

// ULTRA-FAST Object Schema with field caching
export class ObjectSchema<T extends Record<string, any>> extends Schema<T> {
  private _fieldKeys: string[];
  private _fieldSchemas: Schema<any>[];
  
  constructor(private shape: { [K in keyof T]: Schema<T[K]> }) {
    super();
    const entries = Object.entries(shape);
    this._fieldKeys = entries.map(([k]) => k);
    this._fieldSchemas = entries.map(([, v]) => v as Schema<any>);
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    // INLINE: Type check
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { success: false, error: { issues: [{ path, message: 'Expected object', code: 'invalid_type' }] } };
    }
    
    // OPTIMIZED: Pre-allocated result object and inline validation
    const result: any = {};
    
    // FAST PATH: Validate all fields inline
    for (let i = 0; i < this._fieldKeys.length; i++) {
      const key = this._fieldKeys[i];
      const schema = this._fieldSchemas[i];
      const fieldValue = value[key];
      
      // INLINE: Direct validation without intermediate calls
      const fieldResult = schema._validate(fieldValue, [...path, key]);
      if (!fieldResult.success) {
        return fieldResult as any;
      }
      result[key] = fieldResult.data;
    }
    
    return { success: true, data: result as T };
  }
}

// Factory functions
export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  enum: <T extends string>(values: readonly T[]) => new EnumSchema(values),
  object: <T extends Record<string, any>>(shape: { [K in keyof T]: Schema<T[K]> }) => new ObjectSchema(shape),
};

export type infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
