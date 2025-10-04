/**
 * dhi - ULTRA-OPTIMIZED Schema API
 * Phase 1 Optimizations: Inline validations + Fast paths + Memory pools
 */

import { readFileSync } from "fs";
import { join } from "path";

const wasmPath = join(import.meta.dir || __dirname, "dhi.wasm");
const wasmBytes = readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBytes, {});
const wasm = wasmModule.instance.exports as any;

const encoder = new TextEncoder();

// OPTIMIZATION: Memory pool to avoid allocations
const POOL_SIZE = 10 * 1024 * 1024; // 10MB
let wasmPoolPtr: number | null = null;
let poolOffset = 0;

function getPool(): number {
  if (!wasmPoolPtr) {
    wasmPoolPtr = wasm.alloc(POOL_SIZE);
  }
  return wasmPoolPtr;
}

function resetPool(): void {
  poolOffset = 0;
}

function poolAlloc(size: number): number {
  const ptr = getPool() + poolOffset;
  poolOffset += size;
  if (poolOffset > POOL_SIZE) {
    throw new Error('Pool exhausted');
  }
  return ptr;
}

// Types
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { issues: Array<{ path: (string | number)[]; message: string; code: string }> } };

// Base Schema with optimization flags
export abstract class Schema<T = any> {
  protected _isSimple = false;
  protected _needsWasm = false;
  protected _compiled?: (value: any) => ValidationResult<T>;
  
  abstract _validate(value: any, path: (string | number)[]): ValidationResult<T>;
  
  // OPTIMIZATION: Compile schema to optimized function
  compile(): void {
    if (this._compiled) return;
    
    try {
      const code = this._generateOptimizedCode();
      if (code) {
        this._compiled = new Function('value', code) as any;
      }
    } catch {
      // Fallback to regular validation
    }
  }
  
  protected _generateOptimizedCode(): string | null {
    return null; // Override in subclasses
  }
  
  parse(value: any): T {
    // Use compiled version if available
    if (this._compiled) {
      const result = this._compiled(value);
      if (!result.success) {
        throw new Error(`Validation failed: ${JSON.stringify(result.error)}`);
      }
      return result.data;
    }
    
    const result = this._validate(value, []);
    if (!result.success) {
      throw new Error(`Validation failed: ${JSON.stringify(result.error)}`);
    }
    return result.data;
  }
  
  safeParse(value: any): ValidationResult<T> {
    if (this._compiled) {
      return this._compiled(value);
    }
    return this._validate(value, []);
  }
  
  optional() { return new OptionalSchema(this); }
  nullable() { return new NullableSchema(this); }
  default(defaultValue: T) { return new DefaultSchema(this, defaultValue); }
  transform<U>(fn: (value: T) => U) { return new TransformSchema(this, fn); }
  refine(check: (value: T) => boolean, message?: string) { return new RefineSchema(this, check, message); }
}

// OPTIMIZED String Schema
export class StringSchema extends Schema<string> {
  protected _isSimple = true;
  private _min?: number;
  private _max?: number;
  private _email = false;
  private _url = false;
  private _uuid = false;
  private _startsWith?: string;
  private _endsWith?: string;
  private _includes?: string;
  private _regex?: RegExp;
  
  min(length: number): this { this._min = length; return this; }
  max(length: number): this { this._max = length; return this; }
  length(length: number): this { this._min = length; this._max = length; return this; }
  
  email(): this { this._email = true; this._needsWasm = true; this._isSimple = false; return this; }
  url(): this { this._url = true; this._needsWasm = true; this._isSimple = false; return this; }
  uuid(): this { this._uuid = true; this._needsWasm = true; this._isSimple = false; return this; }
  
  startsWith(prefix: string): this { this._startsWith = prefix; return this; }
  endsWith(suffix: string): this { this._endsWith = suffix; return this; }
  includes(substring: string): this { this._includes = substring; return this; }
  regex(pattern: RegExp): this { this._regex = pattern; return this; }
  
  trim() { return this.transform(v => v.trim()); }
  lowercase() { return this.transform(v => v.toLowerCase()); }
  uppercase() { return this.transform(v => v.toUpperCase()); }
  
  // OPTIMIZATION: Generate optimized code for simple cases
  protected _generateOptimizedCode(): string | null {
    if (!this._isSimple || this._needsWasm) return null;
    
    const checks: string[] = [];
    checks.push(`if (typeof value !== 'string') return { success: false, error: { issues: [{ path: [], message: 'Expected string', code: 'invalid_type' }] } };`);
    
    if (this._min !== undefined) {
      checks.push(`if (value.length < ${this._min}) return { success: false, error: { issues: [{ path: [], message: 'String too short', code: 'too_small' }] } };`);
    }
    if (this._max !== undefined) {
      checks.push(`if (value.length > ${this._max}) return { success: false, error: { issues: [{ path: [], message: 'String too long', code: 'too_big' }] } };`);
    }
    if (this._startsWith) {
      checks.push(`if (!value.startsWith('${this._startsWith}')) return { success: false, error: { issues: [{ path: [], message: 'Invalid prefix', code: 'invalid_string' }] } };`);
    }
    if (this._endsWith) {
      checks.push(`if (!value.endsWith('${this._endsWith}')) return { success: false, error: { issues: [{ path: [], message: 'Invalid suffix', code: 'invalid_string' }] } };`);
    }
    if (this._includes) {
      checks.push(`if (!value.includes('${this._includes}')) return { success: false, error: { issues: [{ path: [], message: 'Missing substring', code: 'invalid_string' }] } };`);
    }
    
    checks.push(`return { success: true, data: value };`);
    return checks.join('\n');
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<string> {
    // FAST PATH: Inline simple checks
    if (typeof value !== 'string') {
      return { success: false, error: { issues: [{ path, message: 'Expected string', code: 'invalid_type' }] } };
    }
    
    // Length checks (pure JS - fast!)
    if (this._min !== undefined && value.length < this._min) {
      return { success: false, error: { issues: [{ path, message: `String must be at least ${this._min} characters`, code: 'too_small' }] } };
    }
    if (this._max !== undefined && value.length > this._max) {
      return { success: false, error: { issues: [{ path, message: `String must be at most ${this._max} characters`, code: 'too_big' }] } };
    }
    
    // String checks (pure JS - fast!)
    if (this._startsWith && !value.startsWith(this._startsWith)) {
      return { success: false, error: { issues: [{ path, message: `String must start with "${this._startsWith}"`, code: 'invalid_string' }] } };
    }
    if (this._endsWith && !value.endsWith(this._endsWith)) {
      return { success: false, error: { issues: [{ path, message: `String must end with "${this._endsWith}"`, code: 'invalid_string' }] } };
    }
    if (this._includes && !value.includes(this._includes)) {
      return { success: false, error: { issues: [{ path, message: `String must include "${this._includes}"`, code: 'invalid_string' }] } };
    }
    if (this._regex && !this._regex.test(value)) {
      return { success: false, error: { issues: [{ path, message: 'Invalid format', code: 'invalid_string' }] } };
    }
    
    // WASM checks (only when needed)
    if (this._email || this._url || this._uuid) {
      // OPTIMIZATION: Use memory pool
      const bytes = encoder.encode(value);
      const ptr = poolAlloc(bytes.length);
      const memory = new Uint8Array(wasm.memory.buffer);
      memory.set(bytes, ptr);
      
      if (this._email) {
        const valid = wasm.validate_email(ptr, bytes.length);
        if (!valid) {
          return { success: false, error: { issues: [{ path, message: 'Invalid email', code: 'invalid_string' }] } };
        }
      }
      
      if (this._url) {
        const valid = wasm.validate_url(ptr, bytes.length);
        if (!valid) {
          return { success: false, error: { issues: [{ path, message: 'Invalid URL', code: 'invalid_string' }] } };
        }
      }
      
      if (this._uuid) {
        const valid = wasm.validate_uuid(ptr, bytes.length);
        if (!valid) {
          return { success: false, error: { issues: [{ path, message: 'Invalid UUID', code: 'invalid_string' }] } };
        }
      }
    }
    
    return { success: true, data: value };
  }
}

// OPTIMIZED Number Schema
export class NumberSchema extends Schema<number> {
  protected _isSimple = true;
  private _min?: number;
  private _max?: number;
  private _gt?: number;
  private _gte?: number;
  private _lt?: number;
  private _lte?: number;
  private _positive = false;
  private _int = false;
  
  min(value: number): this { this._min = value; return this; }
  max(value: number): this { this._max = value; return this; }
  gt(value: number): this { this._gt = value; return this; }
  gte(value: number): this { this._gte = value; return this; }
  lt(value: number): this { this._lt = value; return this; }
  lte(value: number): this { this._lte = value; return this; }
  positive(): this { this._positive = true; return this; }
  int(): this { this._int = true; return this; }
  
  // OPTIMIZATION: Generate optimized code
  protected _generateOptimizedCode(): string | null {
    const checks: string[] = [];
    checks.push(`if (typeof value !== 'number') return { success: false, error: { issues: [{ path: [], message: 'Expected number', code: 'invalid_type' }] } };`);
    
    if (this._int) {
      checks.push(`if (!Number.isInteger(value)) return { success: false, error: { issues: [{ path: [], message: 'Expected integer', code: 'invalid_type' }] } };`);
    }
    if (this._positive) {
      checks.push(`if (value <= 0) return { success: false, error: { issues: [{ path: [], message: 'Must be positive', code: 'too_small' }] } };`);
    }
    if (this._min !== undefined) {
      checks.push(`if (value < ${this._min}) return { success: false, error: { issues: [{ path: [], message: 'Too small', code: 'too_small' }] } };`);
    }
    if (this._max !== undefined) {
      checks.push(`if (value > ${this._max}) return { success: false, error: { issues: [{ path: [], message: 'Too big', code: 'too_big' }] } };`);
    }
    if (this._gt !== undefined) {
      checks.push(`if (value <= ${this._gt}) return { success: false, error: { issues: [{ path: [], message: 'Too small', code: 'too_small' }] } };`);
    }
    if (this._gte !== undefined) {
      checks.push(`if (value < ${this._gte}) return { success: false, error: { issues: [{ path: [], message: 'Too small', code: 'too_small' }] } };`);
    }
    if (this._lt !== undefined) {
      checks.push(`if (value >= ${this._lt}) return { success: false, error: { issues: [{ path: [], message: 'Too big', code: 'too_big' }] } };`);
    }
    if (this._lte !== undefined) {
      checks.push(`if (value > ${this._lte}) return { success: false, error: { issues: [{ path: [], message: 'Too big', code: 'too_big' }] } };`);
    }
    
    checks.push(`return { success: true, data: value };`);
    return checks.join('\n');
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<number> {
    // FAST PATH: All checks inline (pure JS)
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
      return { success: false, error: { issues: [{ path, message: `Must be at least ${this._min}`, code: 'too_small' }] } };
    }
    if (this._max !== undefined && value > this._max) {
      return { success: false, error: { issues: [{ path, message: `Must be at most ${this._max}`, code: 'too_big' }] } };
    }
    if (this._gt !== undefined && value <= this._gt) {
      return { success: false, error: { issues: [{ path, message: `Must be greater than ${this._gt}`, code: 'too_small' }] } };
    }
    if (this._gte !== undefined && value < this._gte) {
      return { success: false, error: { issues: [{ path, message: `Must be at least ${this._gte}`, code: 'too_small' }] } };
    }
    if (this._lt !== undefined && value >= this._lt) {
      return { success: false, error: { issues: [{ path, message: `Must be less than ${this._lt}`, code: 'too_big' }] } };
    }
    if (this._lte !== undefined && value > this._lte) {
      return { success: false, error: { issues: [{ path, message: `Must be at most ${this._lte}`, code: 'too_big' }] } };
    }
    
    return { success: true, data: value };
  }
}

// Fast primitive schemas (inlined)
export class BooleanSchema extends Schema<boolean> {
  protected _isSimple = true;
  _validate(value: any, path: (string | number)[]): ValidationResult<boolean> {
    return typeof value === 'boolean'
      ? { success: true, data: value }
      : { success: false, error: { issues: [{ path, message: 'Expected boolean', code: 'invalid_type' }] } };
  }
}

export class NullSchema extends Schema<null> {
  protected _isSimple = true;
  _validate(value: any, path: (string | number)[]): ValidationResult<null> {
    return value === null
      ? { success: true, data: null }
      : { success: false, error: { issues: [{ path, message: 'Expected null', code: 'invalid_type' }] } };
  }
}

export class AnySchema extends Schema<any> {
  protected _isSimple = true;
  _validate(value: any, _path: (string | number)[]): ValidationResult<any> {
    return { success: true, data: value };
  }
}

// Composite schemas (using same implementation as before but with optimizations)
export class ObjectSchema<T extends Record<string, any>> extends Schema<T> {
  constructor(private shape: { [K in keyof T]: Schema<T[K]> }) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { success: false, error: { issues: [{ path, message: 'Expected object', code: 'invalid_type' }] } };
    }
    
    // OPTIMIZATION: Reset pool for batch operations
    resetPool();
    
    const result: any = {};
    const issues: any[] = [];
    
    for (const [key, schema] of Object.entries(this.shape)) {
      const fieldResult = (schema as Schema)._validate(value[key], [...path, key]);
      if (!fieldResult.success) {
        issues.push(...fieldResult.error.issues);
      } else {
        result[key] = fieldResult.data;
      }
    }
    
    if (issues.length > 0) {
      return { success: false, error: { issues } };
    }
    
    return { success: true, data: result as T };
  }
}

// Modifiers
export class OptionalSchema<T> extends Schema<T | undefined> {
  constructor(private inner: Schema<T>) { super(); }
  _validate(value: any, path: (string | number)[]): ValidationResult<T | undefined> {
    return value === undefined ? { success: true, data: undefined } : this.inner._validate(value, path);
  }
}

export class NullableSchema<T> extends Schema<T | null> {
  constructor(private inner: Schema<T>) { super(); }
  _validate(value: any, path: (string | number)[]): ValidationResult<T | null> {
    return value === null ? { success: true, data: null } : this.inner._validate(value, path);
  }
}

export class DefaultSchema<T> extends Schema<T> {
  constructor(private inner: Schema<T>, private defaultValue: T) { super(); }
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    return value === undefined ? { success: true, data: this.defaultValue } : this.inner._validate(value, path);
  }
}

export class TransformSchema<T, U> extends Schema<U> {
  constructor(private inner: Schema<T>, private transformer: (value: T) => U) { super(); }
  _validate(value: any, path: (string | number)[]): ValidationResult<U> {
    const result = this.inner._validate(value, path);
    return result.success ? { success: true, data: this.transformer(result.data) } : result;
  }
}

export class RefineSchema<T> extends Schema<T> {
  constructor(private inner: Schema<T>, private check: (value: T) => boolean, private message?: string) { super(); }
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    const result = this.inner._validate(value, path);
    if (!result.success) return result;
    if (!this.check(result.data)) {
      return { success: false, error: { issues: [{ path, message: this.message || 'Invalid value', code: 'custom' }] } };
    }
    return result;
  }
}

// Factory functions
export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  null: () => new NullSchema(),
  any: () => new AnySchema(),
  
  object: <T extends Record<string, any>>(shape: { [K in keyof T]: Schema<T[K]> }) => new ObjectSchema(shape),
  
  optional: <T>(schema: Schema<T>) => new OptionalSchema(schema),
  nullable: <T>(schema: Schema<T>) => new NullableSchema(schema),
};

export type infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
