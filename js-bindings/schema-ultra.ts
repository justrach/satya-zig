/**
 * dhi - ULTRA Schema API
 * ZERO overhead - beats Zod
 */

import { readFileSync } from "fs";
import { join } from "path";

const wasmPath = join(import.meta.dir || __dirname, "dhi.wasm");
const wasmBytes = readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBytes, {});
const wasm = wasmModule.instance.exports as any;

const encoder = new TextEncoder();

// Reuse error objects to avoid allocation
const ERROR = { success: false as const, error: { issues: [{ path: [] as any[], message: '', code: '' }] } };

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { issues: Array<{ path: any[]; message: string; code: string }> } };

export abstract class Schema<T = any> {
  abstract _validate(value: any): ValidationResult<T>;
  
  parse(value: any): T {
    const result = this._validate(value);
    if (!result.success) throw new Error(`Validation failed`);
    return result.data;
  }
  
  safeParse(value: any): ValidationResult<T> {
    return this._validate(value);
  }
}

export class StringSchema extends Schema<string> {
  private _min?: number;
  private _max?: number;
  private _email = false;
  
  min(length: number): this { this._min = length; return this; }
  max(length: number): this { this._max = length; return this; }
  email(): this { this._email = true; return this; }
  
  _validate(value: any): ValidationResult<string> {
    if (typeof value !== 'string') {
      return { success: false, error: { issues: [{ path: [], message: 'Expected string', code: 'invalid_type' }] } };
    }
    
    const len = value.length;
    if (this._min !== undefined && len < this._min) {
      return { success: false, error: { issues: [{ path: [], message: 'Too short', code: 'too_small' }] } };
    }
    if (this._max !== undefined && len > this._max) {
      return { success: false, error: { issues: [{ path: [], message: 'Too long', code: 'too_big' }] } };
    }
    
    if (this._email) {
      // Quick JS check first
      if (!value.includes('@') || !value.includes('.')) {
        return { success: false, error: { issues: [{ path: [], message: 'Invalid email', code: 'invalid_string' }] } };
      }
      // Then WASM
      const bytes = encoder.encode(value);
      const ptr = wasm.alloc(bytes.length);
      new Uint8Array(wasm.memory.buffer).set(bytes, ptr);
      const valid = wasm.validate_email(ptr, bytes.length);
      wasm.dealloc(ptr, bytes.length);
      if (!valid) {
        return { success: false, error: { issues: [{ path: [], message: 'Invalid email', code: 'invalid_string' }] } };
      }
    }
    
    return { success: true, data: value };
  }
}

export class NumberSchema extends Schema<number> {
  private _min?: number;
  private _max?: number;
  private _positive = false;
  private _int = false;
  
  min(value: number): this { this._min = value; return this; }
  max(value: number): this { this._max = value; return this; }
  positive(): this { this._positive = true; return this; }
  int(): this { this._int = true; return this; }
  
  _validate(value: any): ValidationResult<number> {
    if (typeof value !== 'number') {
      return { success: false, error: { issues: [{ path: [], message: 'Expected number', code: 'invalid_type' }] } };
    }
    if (this._int && (value | 0) !== value) {
      return { success: false, error: { issues: [{ path: [], message: 'Expected integer', code: 'invalid_type' }] } };
    }
    if (this._positive && value <= 0) {
      return { success: false, error: { issues: [{ path: [], message: 'Must be positive', code: 'too_small' }] } };
    }
    if (this._min !== undefined && value < this._min) {
      return { success: false, error: { issues: [{ path: [], message: 'Too small', code: 'too_small' }] } };
    }
    if (this._max !== undefined && value > this._max) {
      return { success: false, error: { issues: [{ path: [], message: 'Too big', code: 'too_big' }] } };
    }
    
    return { success: true, data: value };
  }
}

export class BooleanSchema extends Schema<boolean> {
  _validate(value: any): ValidationResult<boolean> {
    return typeof value === 'boolean'
      ? { success: true, data: value }
      : { success: false, error: { issues: [{ path: [], message: 'Expected boolean', code: 'invalid_type' }] } };
  }
}

export class EnumSchema<T extends string> extends Schema<T> {
  private _set: Set<string>;
  
  constructor(private values: readonly T[]) {
    super();
    this._set = new Set(values);
  }
  
  _validate(value: any): ValidationResult<T> {
    return this._set.has(value)
      ? { success: true, data: value }
      : { success: false, error: { issues: [{ path: [], message: 'Invalid enum', code: 'invalid_enum_value' }] } };
  }
}

export class ObjectSchema<T extends Record<string, any>> extends Schema<T> {
  private _keys: string[];
  private _schemas: Schema<any>[];
  
  constructor(shape: { [K in keyof T]: Schema<T[K]> }) {
    super();
    const entries = Object.entries(shape);
    this._keys = entries.map(([k]) => k);
    this._schemas = entries.map(([, v]) => v as Schema<any>);
  }
  
  _validate(value: any): ValidationResult<T> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { success: false, error: { issues: [{ path: [], message: 'Expected object', code: 'invalid_type' }] } };
    }
    
    const result: any = {};
    const len = this._keys.length;
    
    for (let i = 0; i < len; i++) {
      const key = this._keys[i];
      const fieldResult = this._schemas[i]._validate(value[key]);
      if (!fieldResult.success) {
        return fieldResult as any;
      }
      result[key] = fieldResult.data;
    }
    
    return { success: true, data: result as T };
  }
}

export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  enum: <T extends string>(values: readonly T[]) => new EnumSchema(values),
  object: <T extends Record<string, any>>(shape: { [K in keyof T]: Schema<T[K]> }) => new ObjectSchema(shape),
};

export type infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
