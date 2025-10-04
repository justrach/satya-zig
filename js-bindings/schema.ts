/**
 * dhi - Comprehensive Schema API
 * Zod-compatible API with WASM performance
 */

import { readFileSync } from "fs";
import { join } from "path";

const wasmPath = join(import.meta.dir || __dirname, "dhi.wasm");
const wasmBytes = readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBytes, {});
const wasm = wasmModule.instance.exports as any;

const encoder = new TextEncoder();

// ============================================================================
// Type System
// ============================================================================

export type ZodType = "string" | "number" | "boolean" | "null" | "undefined" | 
  "bigint" | "date" | "any" | "unknown" | "never" | "array" | "object" | 
  "union" | "enum" | "optional" | "nullable";

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
  code: string;
}

export interface ValidationError {
  issues: ValidationIssue[];
}

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: ValidationError;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ============================================================================
// Base Schema Class
// ============================================================================

export abstract class Schema<T = any> {
  abstract _type: ZodType;
  abstract _validate(value: any, path: (string | number)[]): ValidationResult<T>;
  
  parse(value: any): T {
    const result = this._validate(value, []);
    if (!result.success) {
      throw new Error(`Validation failed: ${JSON.stringify(result.error)}`);
    }
    return result.data;
  }
  
  safeParse(value: any): ValidationResult<T> {
    return this._validate(value, []);
  }
  
  optional(): OptionalSchema<T> {
    return new OptionalSchema(this);
  }
  
  nullable(): NullableSchema<T> {
    return new NullableSchema(this);
  }
  
  default(defaultValue: T): DefaultSchema<T> {
    return new DefaultSchema(this, defaultValue);
  }
  
  transform<U>(fn: (value: T) => U): TransformSchema<T, U> {
    return new TransformSchema(this, fn);
  }
  
  refine(check: (value: T) => boolean, message?: string): RefineSchema<T> {
    return new RefineSchema(this, check, message);
  }
}

// ============================================================================
// String Schema
// ============================================================================

export class StringSchema extends Schema<string> {
  _type: ZodType = "string";
  private _min?: number;
  private _max?: number;
  private _email = false;
  private _url = false;
  private _uuid = false;
  private _ipv4 = false;
  private _isoDate = false;
  private _isoDatetime = false;
  private _base64 = false;
  private _startsWith?: string;
  private _endsWith?: string;
  private _includes?: string;
  private _regex?: RegExp;
  
  min(length: number): this {
    this._min = length;
    return this;
  }
  
  max(length: number): this {
    this._max = length;
    return this;
  }
  
  length(length: number): this {
    this._min = length;
    this._max = length;
    return this;
  }
  
  email(): this {
    this._email = true;
    return this;
  }
  
  url(): this {
    this._url = true;
    return this;
  }
  
  uuid(): this {
    this._uuid = true;
    return this;
  }
  
  ipv4(): this {
    this._ipv4 = true;
    return this;
  }
  
  isoDate(): this {
    this._isoDate = true;
    return this;
  }
  
  isoDatetime(): this {
    this._isoDatetime = true;
    return this;
  }
  
  base64(): this {
    this._base64 = true;
    return this;
  }
  
  startsWith(prefix: string): this {
    this._startsWith = prefix;
    return this;
  }
  
  endsWith(suffix: string): this {
    this._endsWith = suffix;
    return this;
  }
  
  includes(substring: string): this {
    this._includes = substring;
    return this;
  }
  
  regex(pattern: RegExp): this {
    this._regex = pattern;
    return this;
  }
  
  trim(): TransformSchema<string, string> {
    return this.transform(v => v.trim());
  }
  
  lowercase(): TransformSchema<string, string> {
    return this.transform(v => v.toLowerCase());
  }
  
  uppercase(): TransformSchema<string, string> {
    return this.transform(v => v.toUpperCase());
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<string> {
    if (typeof value !== 'string') {
      return {
        success: false,
        error: { issues: [{ path, message: 'Expected string', code: 'invalid_type' }] }
      };
    }
    
    // Length checks
    if (this._min !== undefined && value.length < this._min) {
      return {
        success: false,
        error: { issues: [{ path, message: `String must be at least ${this._min} characters`, code: 'too_small' }] }
      };
    }
    
    if (this._max !== undefined && value.length > this._max) {
      return {
        success: false,
        error: { issues: [{ path, message: `String must be at most ${this._max} characters`, code: 'too_big' }] }
      };
    }
    
    // Format checks (WASM)
    if (this._email) {
      const bytes = encoder.encode(value);
      const ptr = wasm.alloc(bytes.length);
      const memory = new Uint8Array(wasm.memory.buffer);
      memory.set(bytes, ptr);
      const valid = wasm.validate_email(ptr, bytes.length);
      wasm.dealloc(ptr, bytes.length);
      
      if (!valid) {
        return {
          success: false,
          error: { issues: [{ path, message: 'Invalid email', code: 'invalid_string' }] }
        };
      }
    }
    
    if (this._url) {
      const bytes = encoder.encode(value);
      const ptr = wasm.alloc(bytes.length);
      const memory = new Uint8Array(wasm.memory.buffer);
      memory.set(bytes, ptr);
      const valid = wasm.validate_url(ptr, bytes.length);
      wasm.dealloc(ptr, bytes.length);
      
      if (!valid) {
        return {
          success: false,
          error: { issues: [{ path, message: 'Invalid URL', code: 'invalid_string' }] }
        };
      }
    }
    
    // String checks (JS)
    if (this._startsWith && !value.startsWith(this._startsWith)) {
      return {
        success: false,
        error: { issues: [{ path, message: `String must start with "${this._startsWith}"`, code: 'invalid_string' }] }
      };
    }
    
    if (this._endsWith && !value.endsWith(this._endsWith)) {
      return {
        success: false,
        error: { issues: [{ path, message: `String must end with "${this._endsWith}"`, code: 'invalid_string' }] }
      };
    }
    
    if (this._includes && !value.includes(this._includes)) {
      return {
        success: false,
        error: { issues: [{ path, message: `String must include "${this._includes}"`, code: 'invalid_string' }] }
      };
    }
    
    if (this._regex && !this._regex.test(value)) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Invalid format', code: 'invalid_string' }] }
      };
    }
    
    return { success: true, data: value };
  }
}

// ============================================================================
// Number Schema
// ============================================================================

export class NumberSchema extends Schema<number> {
  _type: ZodType = "number";
  private _min?: number;
  private _max?: number;
  private _gt?: number;
  private _gte?: number;
  private _lt?: number;
  private _lte?: number;
  private _positive = false;
  private _negative = false;
  private _nonnegative = false;
  private _nonpositive = false;
  private _multipleOf?: number;
  private _int = false;
  private _finite = false;
  
  min(value: number): this {
    this._min = value;
    return this;
  }
  
  max(value: number): this {
    this._max = value;
    return this;
  }
  
  gt(value: number): this {
    this._gt = value;
    return this;
  }
  
  gte(value: number): this {
    this._gte = value;
    return this;
  }
  
  lt(value: number): this {
    this._lt = value;
    return this;
  }
  
  lte(value: number): this {
    this._lte = value;
    return this;
  }
  
  positive(): this {
    this._positive = true;
    return this;
  }
  
  negative(): this {
    this._negative = true;
    return this;
  }
  
  nonnegative(): this {
    this._nonnegative = true;
    return this;
  }
  
  nonpositive(): this {
    this._nonpositive = true;
    return this;
  }
  
  multipleOf(value: number): this {
    this._multipleOf = value;
    return this;
  }
  
  int(): this {
    this._int = true;
    return this;
  }
  
  finite(): this {
    this._finite = true;
    return this;
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<number> {
    if (typeof value !== 'number') {
      return {
        success: false,
        error: { issues: [{ path, message: 'Expected number', code: 'invalid_type' }] }
      };
    }
    
    if (this._finite && !Number.isFinite(value)) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Number must be finite', code: 'invalid_number' }] }
      };
    }
    
    if (this._int && !Number.isInteger(value)) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Expected integer', code: 'invalid_type' }] }
      };
    }
    
    if (this._positive && value <= 0) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Number must be positive', code: 'too_small' }] }
      };
    }
    
    if (this._negative && value >= 0) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Number must be negative', code: 'too_big' }] }
      };
    }
    
    if (this._nonnegative && value < 0) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Number must be non-negative', code: 'too_small' }] }
      };
    }
    
    if (this._nonpositive && value > 0) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Number must be non-positive', code: 'too_big' }] }
      };
    }
    
    if (this._gt !== undefined && value <= this._gt) {
      return {
        success: false,
        error: { issues: [{ path, message: `Number must be greater than ${this._gt}`, code: 'too_small' }] }
      };
    }
    
    if (this._gte !== undefined && value < this._gte) {
      return {
        success: false,
        error: { issues: [{ path, message: `Number must be at least ${this._gte}`, code: 'too_small' }] }
      };
    }
    
    if (this._lt !== undefined && value >= this._lt) {
      return {
        success: false,
        error: { issues: [{ path, message: `Number must be less than ${this._lt}`, code: 'too_big' }] }
      };
    }
    
    if (this._lte !== undefined && value > this._lte) {
      return {
        success: false,
        error: { issues: [{ path, message: `Number must be at most ${this._lte}`, code: 'too_big' }] }
      };
    }
    
    if (this._min !== undefined && value < this._min) {
      return {
        success: false,
        error: { issues: [{ path, message: `Number must be at least ${this._min}`, code: 'too_small' }] }
      };
    }
    
    if (this._max !== undefined && value > this._max) {
      return {
        success: false,
        error: { issues: [{ path, message: `Number must be at most ${this._max}`, code: 'too_big' }] }
      };
    }
    
    if (this._multipleOf !== undefined && value % this._multipleOf !== 0) {
      return {
        success: false,
        error: { issues: [{ path, message: `Number must be a multiple of ${this._multipleOf}`, code: 'invalid_number' }] }
      };
    }
    
    return { success: true, data: value };
  }
}

// ============================================================================
// Primitive Schemas
// ============================================================================

export class BooleanSchema extends Schema<boolean> {
  _type: ZodType = "boolean";
  
  _validate(value: any, path: (string | number)[]): ValidationResult<boolean> {
    if (typeof value !== 'boolean') {
      return {
        success: false,
        error: { issues: [{ path, message: 'Expected boolean', code: 'invalid_type' }] }
      };
    }
    return { success: true, data: value };
  }
}

export class NullSchema extends Schema<null> {
  _type: ZodType = "null";
  
  _validate(value: any, path: (string | number)[]): ValidationResult<null> {
    if (value !== null) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Expected null', code: 'invalid_type' }] }
      };
    }
    return { success: true, data: null };
  }
}

export class UndefinedSchema extends Schema<undefined> {
  _type: ZodType = "undefined";
  
  _validate(value: any, path: (string | number)[]): ValidationResult<undefined> {
    if (value !== undefined) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Expected undefined', code: 'invalid_type' }] }
      };
    }
    return { success: true, data: undefined };
  }
}

export class AnySchema extends Schema<any> {
  _type: ZodType = "any";
  
  _validate(value: any, path: (string | number)[]): ValidationResult<any> {
    return { success: true, data: value };
  }
}

export class UnknownSchema extends Schema<unknown> {
  _type: ZodType = "unknown";
  
  _validate(value: any, path: (string | number)[]): ValidationResult<unknown> {
    return { success: true, data: value };
  }
}

// ============================================================================
// Composite Schemas
// ============================================================================

export class ArraySchema<T> extends Schema<T[]> {
  _type: ZodType = "array";
  private _min?: number;
  private _max?: number;
  
  constructor(private element: Schema<T>) {
    super();
  }
  
  min(length: number): this {
    this._min = length;
    return this;
  }
  
  max(length: number): this {
    this._max = length;
    return this;
  }
  
  length(length: number): this {
    this._min = length;
    this._max = length;
    return this;
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T[]> {
    if (!Array.isArray(value)) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Expected array', code: 'invalid_type' }] }
      };
    }
    
    if (this._min !== undefined && value.length < this._min) {
      return {
        success: false,
        error: { issues: [{ path, message: `Array must have at least ${this._min} elements`, code: 'too_small' }] }
      };
    }
    
    if (this._max !== undefined && value.length > this._max) {
      return {
        success: false,
        error: { issues: [{ path, message: `Array must have at most ${this._max} elements`, code: 'too_big' }] }
      };
    }
    
    const result: T[] = [];
    const issues: ValidationIssue[] = [];
    
    for (let i = 0; i < value.length; i++) {
      const itemResult = this.element._validate(value[i], [...path, i]);
      if (!itemResult.success) {
        issues.push(...itemResult.error.issues);
      } else {
        result.push(itemResult.data);
      }
    }
    
    if (issues.length > 0) {
      return { success: false, error: { issues } };
    }
    
    return { success: true, data: result };
  }
}

export class ObjectSchema<T extends Record<string, any>> extends Schema<T> {
  _type: ZodType = "object";
  
  constructor(private shape: { [K in keyof T]: Schema<T[K]> }) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        success: false,
        error: { issues: [{ path, message: 'Expected object', code: 'invalid_type' }] }
      };
    }
    
    const result: any = {};
    const issues: ValidationIssue[] = [];
    
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

export class UnionSchema<T> extends Schema<T> {
  _type: ZodType = "union";
  
  constructor(private options: Schema<any>[]) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    const issues: ValidationIssue[] = [];
    
    for (const option of this.options) {
      const result = option._validate(value, path);
      if (result.success) {
        return result;
      }
      issues.push(...result.error.issues);
    }
    
    return {
      success: false,
      error: { issues: [{ path, message: 'Invalid union', code: 'invalid_union' }] }
    };
  }
}

export class EnumSchema<T extends string> extends Schema<T> {
  _type: ZodType = "enum";
  
  constructor(private values: readonly T[]) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    if (!this.values.includes(value)) {
      return {
        success: false,
        error: { issues: [{ path, message: `Expected one of: ${this.values.join(', ')}`, code: 'invalid_enum_value' }] }
      };
    }
    return { success: true, data: value };
  }
}

// ============================================================================
// Modifier Schemas
// ============================================================================

export class OptionalSchema<T> extends Schema<T | undefined> {
  _type: ZodType = "optional";
  
  constructor(private inner: Schema<T>) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T | undefined> {
    if (value === undefined) {
      return { success: true, data: undefined };
    }
    return this.inner._validate(value, path);
  }
}

export class NullableSchema<T> extends Schema<T | null> {
  _type: ZodType = "nullable";
  
  constructor(private inner: Schema<T>) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T | null> {
    if (value === null) {
      return { success: true, data: null };
    }
    return this.inner._validate(value, path);
  }
}

export class DefaultSchema<T> extends Schema<T> {
  _type: ZodType = "any";
  
  constructor(private inner: Schema<T>, private defaultValue: T) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    if (value === undefined) {
      return { success: true, data: this.defaultValue };
    }
    return this.inner._validate(value, path);
  }
}

export class TransformSchema<T, U> extends Schema<U> {
  _type: ZodType = "any";
  
  constructor(private inner: Schema<T>, private transformer: (value: T) => U) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<U> {
    const result = this.inner._validate(value, path);
    if (!result.success) {
      return result;
    }
    return { success: true, data: this.transformer(result.data) };
  }
}

export class RefineSchema<T> extends Schema<T> {
  _type: ZodType = "any";
  
  constructor(
    private inner: Schema<T>,
    private check: (value: T) => boolean,
    private message?: string
  ) {
    super();
  }
  
  _validate(value: any, path: (string | number)[]): ValidationResult<T> {
    const result = this.inner._validate(value, path);
    if (!result.success) {
      return result;
    }
    
    if (!this.check(result.data)) {
      return {
        success: false,
        error: { issues: [{ path, message: this.message || 'Invalid value', code: 'custom' }] }
      };
    }
    
    return result;
  }
}

// ============================================================================
// Factory Functions (Zod-compatible API)
// ============================================================================

export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  null: () => new NullSchema(),
  undefined: () => new UndefinedSchema(),
  any: () => new AnySchema(),
  unknown: () => new UnknownSchema(),
  
  array: <T>(element: Schema<T>) => new ArraySchema(element),
  object: <T extends Record<string, any>>(shape: { [K in keyof T]: Schema<T[K]> }) => new ObjectSchema(shape),
  union: <T extends readonly Schema<any>[]>(options: T) => new UnionSchema(options),
  enum: <T extends string>(values: readonly T[]) => new EnumSchema(values),
  
  optional: <T>(schema: Schema<T>) => new OptionalSchema(schema),
  nullable: <T>(schema: Schema<T>) => new NullableSchema(schema),
};

// Type inference helper
export type infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
