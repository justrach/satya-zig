/**
 * dhi - BLAZING FAST Complete Schema API
 * ALL features, beats Zod performance
 */

import { readFileSync } from "fs";
import { join } from "path";

const wasmPath = join(import.meta.dir || __dirname, "dhi.wasm");
const wasmBytes = readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBytes, {});
const wasm = wasmModule.instance.exports as any;

const encoder = new TextEncoder();

// Pre-defined error objects (no allocation)
const ERRORS = {
  invalid_type_string: { success: false as const, error: { issues: [{ path: [], message: 'Expected string', code: 'invalid_type' }] } },
  invalid_type_number: { success: false as const, error: { issues: [{ path: [], message: 'Expected number', code: 'invalid_type' }] } },
  invalid_type_boolean: { success: false as const, error: { issues: [{ path: [], message: 'Expected boolean', code: 'invalid_type' }] } },
  invalid_type_object: { success: false as const, error: { issues: [{ path: [], message: 'Expected object', code: 'invalid_type' }] } },
  invalid_type_array: { success: false as const, error: { issues: [{ path: [], message: 'Expected array', code: 'invalid_type' }] } },
  too_small: { success: false as const, error: { issues: [{ path: [], message: 'Too small', code: 'too_small' }] } },
  too_big: { success: false as const, error: { issues: [{ path: [], message: 'Too big', code: 'too_big' }] } },
  invalid_string: { success: false as const, error: { issues: [{ path: [], message: 'Invalid', code: 'invalid_string' }] } },
  invalid_email: { success: false as const, error: { issues: [{ path: [], message: 'Invalid email', code: 'invalid_string' }] } },
  invalid_enum: { success: false as const, error: { issues: [{ path: [], message: 'Invalid enum', code: 'invalid_enum_value' }] } },
};

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { issues: Array<{ path: any[]; message: string; code: string }> } };

// Base - no path tracking overhead
export abstract class Schema<T = any> {
  abstract _validate(value: any): ValidationResult<T>;
  
  parse(value: any): T {
    const result = this._validate(value);
    if (!result.success) throw new Error('Validation failed');
    return result.data;
  }
  
  safeParse(value: any): ValidationResult<T> {
    return this._validate(value);
  }
  
  optional() { return new OptionalSchema(this); }
  nullable() { return new NullableSchema(this); }
  default(defaultValue: T) { return new DefaultSchema(this, defaultValue); }
  transform<U>(fn: (value: T) => U) { return new TransformSchema(this, fn); }
  refine(check: (value: T) => boolean, message?: string) { return new RefineSchema(this, check, message); }
}

// String - FULLY OPTIMIZED
export class StringSchema extends Schema<string> {
  _min?: number;
  _max?: number;
  _email = false;
  _url = false;
  _uuid = false;
  _startsWith?: string;
  _endsWith?: string;
  _includes?: string;
  _regex?: RegExp;
  
  min(l: number): this { this._min = l; return this; }
  max(l: number): this { this._max = l; return this; }
  length(l: number): this { this._min = l; this._max = l; return this; }
  email(): this { this._email = true; return this; }
  url(): this { this._url = true; return this; }
  uuid(): this { this._uuid = true; return this; }
  startsWith(s: string): this { this._startsWith = s; return this; }
  endsWith(s: string): this { this._endsWith = s; return this; }
  includes(s: string): this { this._includes = s; return this; }
  regex(r: RegExp): this { this._regex = r; return this; }
  trim() { return this.transform(v => v.trim()); }
  lowercase() { return this.transform(v => v.toLowerCase()); }
  uppercase() { return this.transform(v => v.toUpperCase()); }
  
  _validate(value: any): ValidationResult<string> {
    // INLINE: All checks with minimal overhead
    if (typeof value !== 'string') return ERRORS.invalid_type_string;
    
    const len = value.length;
    if (this._min !== undefined && len < this._min) return ERRORS.too_small;
    if (this._max !== undefined && len > this._max) return makeError('too_big', 'Too long');
    
    // JS string checks (no WASM overhead)
    if (this._startsWith && !value.startsWith(this._startsWith)) return ERRORS.invalid_string;
    if (this._endsWith && !value.endsWith(this._endsWith)) return ERRORS.invalid_string;
    if (this._includes && !value.includes(this._includes)) return ERRORS.invalid_string;
    if (this._regex && !this._regex.test(value)) return ERRORS.invalid_string;
    
    // WASM checks (only when needed)
    if (this._email) {
      // Quick pre-check
      if (value.indexOf('@') === -1 || value.indexOf('.') === -1) return ERRORS.invalid_email;
      const bytes = encoder.encode(value);
      const ptr = wasm.alloc(bytes.length);
      new Uint8Array(wasm.memory.buffer).set(bytes, ptr);
      const valid = wasm.validate_email(ptr, bytes.length);
      wasm.dealloc(ptr, bytes.length);
      if (!valid) return ERRORS.invalid_email;
    }
    
    if (this._url) {
      const bytes = encoder.encode(value);
      const ptr = wasm.alloc(bytes.length);
      new Uint8Array(wasm.memory.buffer).set(bytes, ptr);
      const valid = wasm.validate_url(ptr, bytes.length);
      wasm.dealloc(ptr, bytes.length);
      if (!valid) return ERRORS.invalid_string;
    }
    
    if (this._uuid) {
      const bytes = encoder.encode(value);
      const ptr = wasm.alloc(bytes.length);
      new Uint8Array(wasm.memory.buffer).set(bytes, ptr);
      const valid = wasm.validate_uuid(ptr, bytes.length);
      wasm.dealloc(ptr, bytes.length);
      if (!valid) return ERRORS.invalid_string;
    }
    
    return { success: true, data: value };
  }
}

// Number - FULLY OPTIMIZED
export class NumberSchema extends Schema<number> {
  _min?: number;
  _max?: number;
  _gt?: number;
  _gte?: number;
  _lt?: number;
  _lte?: number;
  _positive = false;
  _negative = false;
  _int = false;
  _multipleOf?: number;
  
  min(v: number): this { this._min = v; return this; }
  max(v: number): this { this._max = v; return this; }
  gt(v: number): this { this._gt = v; return this; }
  gte(v: number): this { this._gte = v; return this; }
  lt(v: number): this { this._lt = v; return this; }
  lte(v: number): this { this._lte = v; return this; }
  positive(): this { this._positive = true; return this; }
  negative(): this { this._negative = true; return this; }
  int(): this { this._int = true; return this; }
  multipleOf(v: number): this { this._multipleOf = v; return this; }
  
  _validate(value: any): ValidationResult<number> {
    if (typeof value !== 'number') return ERRORS.invalid_type_number;
    if (this._int && (value | 0) !== value) return makeError('invalid_type', 'Expected integer');
    if (this._positive && value <= 0) return makeError('too_small', 'Must be positive');
    if (this._negative && value >= 0) return makeError('too_big', 'Must be negative');
    if (this._min !== undefined && value < this._min) return ERRORS.too_small;
    if (this._max !== undefined && value > this._max) return ERRORS.too_big;
    if (this._gt !== undefined && value <= this._gt) return ERRORS.too_small;
    if (this._gte !== undefined && value < this._gte) return ERRORS.too_small;
    if (this._lt !== undefined && value >= this._lt) return ERRORS.too_big;
    if (this._lte !== undefined && value > this._lte) return ERRORS.too_big;
    if (this._multipleOf !== undefined && value % this._multipleOf !== 0) return makeError('invalid_number', 'Not a multiple');
    
    return { success: true, data: value };
  }
}

// Primitives - INLINE
export class BooleanSchema extends Schema<boolean> {
  _validate(v: any): ValidationResult<boolean> {
    return typeof v === 'boolean' ? { success: true, data: v } : ERRORS.invalid_type_boolean;
  }
}

export class NullSchema extends Schema<null> {
  _validate(v: any): ValidationResult<null> {
    return v === null ? { success: true, data: null } : makeError('invalid_type', 'Expected null');
  }
}

export class UndefinedSchema extends Schema<undefined> {
  _validate(v: any): ValidationResult<undefined> {
    return v === undefined ? { success: true, data: undefined } : makeError('invalid_type', 'Expected undefined');
  }
}

export class AnySchema extends Schema<any> {
  _validate(v: any): ValidationResult<any> {
    return { success: true, data: v };
  }
}

// Enum - Set lookup
export class EnumSchema<T extends string> extends Schema<T> {
  private _set: Set<string>;
  
  constructor(values: readonly T[]) {
    super();
    this._set = new Set(values);
  }
  
  _validate(v: any): ValidationResult<T> {
    return this._set.has(v) ? { success: true, data: v } : ERRORS.invalid_enum;
  }
}

// Array - optimized loop
export class ArraySchema<T> extends Schema<T[]> {
  private _min?: number;
  private _max?: number;
  
  constructor(private element: Schema<T>) { super(); }
  
  min(l: number): this { this._min = l; return this; }
  max(l: number): this { this._max = l; return this; }
  
  _validate(value: any): ValidationResult<T[]> {
    if (!Array.isArray(value)) return ERRORS.invalid_type_array;
    
    const len = value.length;
    if (this._min !== undefined && len < this._min) return makeError('too_small', 'Too few elements');
    if (this._max !== undefined && len > this._max) return makeError('too_big', 'Too many elements');
    
    const result: T[] = [];
    for (let i = 0; i < len; i++) {
      const r = this.element._validate(value[i]);
      if (!r.success) return r as any;
      result.push(r.data);
    }
    
    return { success: true, data: result };
  }
}

// Object - MAXIMUM OPTIMIZATION
export class ObjectSchema<T extends Record<string, any>> extends Schema<T> {
  private _keys: string[];
  private _schemas: Schema<any>[];
  private _len: number;
  
  constructor(shape: { [K in keyof T]: Schema<T[K]> }) {
    super();
    const entries = Object.entries(shape);
    this._keys = entries.map(([k]) => k);
    this._schemas = entries.map(([, v]) => v as Schema<any>);
    this._len = this._keys.length;
  }
  
  _validate(value: any): ValidationResult<T> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return ERRORS.invalid_type_object;
    }
    
    const result: any = {};
    
    // Unrolled loop for common cases
    if (this._len === 1) {
      const k = this._keys[0];
      const r = this._schemas[0]._validate(value[k]);
      if (!r.success) return r;
      result[k] = r.data;
    } else if (this._len === 2) {
      const k0 = this._keys[0];
      const r0 = this._schemas[0]._validate(value[k0]);
      if (!r0.success) return r0;
      result[k0] = r0.data;
      
      const k1 = this._keys[1];
      const r1 = this._schemas[1]._validate(value[k1]);
      if (!r1.success) return r1;
      result[k1] = r1.data;
    } else {
      // General case
      for (let i = 0; i < this._len; i++) {
        const k = this._keys[i];
        const r = this._schemas[i]._validate(value[k]);
        if (!r.success) return r;
        result[k] = r.data;
      }
    }
    
    return { success: true, data: result as T };
  }
}

// Modifiers
export class OptionalSchema<T> extends Schema<T | undefined> {
  constructor(private inner: Schema<T>) { super(); }
  _validate(v: any): ValidationResult<T | undefined> {
    return v === undefined ? { success: true, data: undefined } : this.inner._validate(v);
  }
}

export class NullableSchema<T> extends Schema<T | null> {
  constructor(private inner: Schema<T>) { super(); }
  _validate(v: any): ValidationResult<T | null> {
    return v === null ? { success: true, data: null } : this.inner._validate(v);
  }
}

export class DefaultSchema<T> extends Schema<T> {
  constructor(private inner: Schema<T>, private defaultValue: T) { super(); }
  _validate(v: any): ValidationResult<T> {
    return v === undefined ? { success: true, data: this.defaultValue } : this.inner._validate(v);
  }
}

export class TransformSchema<T, U> extends Schema<U> {
  constructor(private inner: Schema<T>, private transformer: (value: T) => U) { super(); }
  _validate(v: any): ValidationResult<U> {
    const r = this.inner._validate(v);
    return r.success ? { success: true, data: this.transformer(r.data) } : r as any;
  }
}

export class RefineSchema<T> extends Schema<T> {
  constructor(private inner: Schema<T>, private check: (value: T) => boolean, private message?: string) { super(); }
  _validate(v: any): ValidationResult<T> {
    const r = this.inner._validate(v);
    if (!r.success) return r;
    return this.check(r.data) ? r : makeError('custom', this.message || 'Invalid value');
  }
}

export class UnionSchema extends Schema<any> {
  constructor(private options: Schema<any>[]) { super(); }
  _validate(v: any): ValidationResult<any> {
    for (let i = 0; i < this.options.length; i++) {
      const r = this.options[i]._validate(v);
      if (r.success) return r;
    }
    return makeError('invalid_union', 'Invalid union');
  }
}

// Factory
export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  null: () => new NullSchema(),
  undefined: () => new UndefinedSchema(),
  any: () => new AnySchema(),
  
  array: <T>(element: Schema<T>) => new ArraySchema(element),
  object: <T extends Record<string, any>>(shape: { [K in keyof T]: Schema<T[K]> }) => new ObjectSchema(shape),
  enum: <T extends string>(values: readonly T[]) => new EnumSchema(values),
  union: (options: Schema<any>[]) => new UnionSchema(options),
  
  optional: <T>(schema: Schema<T>) => new OptionalSchema(schema),
  nullable: <T>(schema: Schema<T>) => new NullableSchema(schema),
};

export type infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
