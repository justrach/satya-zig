const std = @import("std");
const validators = @import("validators_comprehensive.zig");

// WASM exports for JavaScript
// All functions use simple types that work across WASM boundary

// String validators
export fn validate_email(ptr: [*]const u8, len: usize) bool {
    const email = ptr[0..len];
    return validators.validateEmail(email);
}

export fn validate_url(ptr: [*]const u8, len: usize) bool {
    const url = ptr[0..len];
    return validators.validateUrl(url);
}

export fn validate_uuid(ptr: [*]const u8, len: usize) bool {
    const uuid = ptr[0..len];
    return validators.validateUuid(uuid);
}

export fn validate_ipv4(ptr: [*]const u8, len: usize) bool {
    const ip = ptr[0..len];
    return validators.validateIpv4(ip);
}

export fn validate_string_length(_: [*]const u8, len: usize, min: usize, max: usize) bool {
    return len >= min and len <= max;
}

export fn validate_iso_date(ptr: [*]const u8, len: usize) bool {
    const date = ptr[0..len];
    return validators.validateIsoDate(date);
}

export fn validate_iso_datetime(ptr: [*]const u8, len: usize) bool {
    const datetime = ptr[0..len];
    return validators.validateIsoDatetime(datetime);
}

export fn validate_base64(ptr: [*]const u8, len: usize) bool {
    const data = ptr[0..len];
    return validators.validateBase64(data);
}

// Number validators
export fn validate_int(value: i64, min: i64, max: i64) bool {
    return value >= min and value <= max;
}

export fn validate_int_gt(value: i64, min: i64) bool {
    return validators.validateGt(i64, value, min);
}

export fn validate_int_gte(value: i64, min: i64) bool {
    return validators.validateGte(i64, value, min);
}

export fn validate_int_lt(value: i64, max: i64) bool {
    return validators.validateLt(i64, value, max);
}

export fn validate_int_lte(value: i64, max: i64) bool {
    return validators.validateLte(i64, value, max);
}

export fn validate_int_positive(value: i64) bool {
    return validators.validatePositive(i64, value);
}

export fn validate_int_non_negative(value: i64) bool {
    return validators.validateNonNegative(i64, value);
}

export fn validate_int_multiple_of(value: i64, divisor: i64) bool {
    return validators.validateMultipleOf(i64, value, divisor);
}

export fn validate_float_gt(value: f64, min: f64) bool {
    return validators.validateGt(f64, value, min);
}

export fn validate_float_finite(value: f64) bool {
    return validators.validateFinite(value);
}

// Memory allocation for JavaScript
export fn alloc(size: usize) ?[*]u8 {
    const slice = std.heap.wasm_allocator.alloc(u8, size) catch return null;
    return slice.ptr;
}

export fn dealloc(ptr: [*]u8, size: usize) void {
    const slice = ptr[0..size];
    std.heap.wasm_allocator.free(slice);
}
