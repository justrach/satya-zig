/// C API for Python bindings
const std = @import("std");
const validator = @import("validator.zig");
const batch = @import("batch_validator.zig");
const validators_comp = @import("validators_comprehensive.zig");
const json_validator = @import("json_batch_validator.zig");

// Export C-compatible functions
export fn satya_validate_int(value: i64, min: i64, max: i64) i32 {
    if (value < min or value > max) {
        return 0; // Invalid
    }
    return 1; // Valid
}

export fn satya_validate_string_length(str: [*:0]const u8, min_len: usize, max_len: usize)  i32 {
    const len = std.mem.len(str);
    if (len < min_len or len > max_len) {
        return 0; // Invalid
    }
    return 1; // Valid
}

export fn satya_validate_email(str: [*:0]const u8)  i32 {
    const email = std.mem.span(str);
    
    // Simple email validation
    const at_pos = std.mem.indexOf(u8, email, "@") orelse return 0;
    if (at_pos == 0) return 0; // No local part
    
    const domain = email[at_pos + 1..];
    if (domain.len == 0) return 0; // No domain
    if (std.mem.indexOf(u8, domain, ".") == null) return 0; // No TLD
    
    return 1; // Valid
}

// Batch validation for performance
export fn satya_validate_int_batch(
    values: [*]const i64,
    count: usize,
    min: i64,
    max: i64,
    results: [*]u8,
)  usize {
    var valid_count: usize = 0;
    for (0..count) |i| {
        const is_valid = values[i] >= min and values[i] <= max;
        results[i] = if (is_valid) 1 else 0;
        if (is_valid) valid_count += 1;
    }
    return valid_count;
}

// Version info
export fn satya_version()  [*:0]const u8 {
    return "0.1.0";
}

// Batch user validation for performance
// Returns number of valid users
export fn satya_validate_users_batch(
    ids: [*]const i64,
    names: [*]const [*:0]const u8,
    emails: [*]const [*:0]const u8,
    ages: [*]const i64,
    count: usize,
    results: [*]u8,
) usize {
    _ = ids; // Not used in validation, just for completeness
    var valid_count: usize = 0;
    
    for (0..count) |i| {
        var is_valid = true;
        
        // Validate name length (1-100)
        const name_len = std.mem.len(names[i]);
        if (name_len < 1 or name_len > 100) {
            is_valid = false;
        }
        
        // Validate email
        if (is_valid) {
            const email = std.mem.span(emails[i]);
            const at_pos = std.mem.indexOf(u8, email, "@") orelse {
                is_valid = false;
                continue;
            };
            if (at_pos == 0) {
                is_valid = false;
                continue;
            }
            const domain = email[at_pos + 1..];
            if (domain.len == 0 or std.mem.indexOf(u8, domain, ".") == null) {
                is_valid = false;
                continue;
            }
        }
        
        // Validate age (18-120)
        if (is_valid and (ages[i] < 18 or ages[i] > 120)) {
            is_valid = false;
        }
        
        results[i] = if (is_valid) 1 else 0;
        if (is_valid) valid_count += 1;
    }
    
    return valid_count;
}

// Initialize/cleanup (for future use with allocators)
export fn satya_init()  void {}
export fn satya_cleanup()  void {}

// ============================================================================
// COMPREHENSIVE VALIDATORS (Pydantic/Zod-style)
// ============================================================================

// String validators
export fn satya_validate_url(str: [*:0]const u8) i32 {
    const url = std.mem.span(str);
    return if (validators_comp.validateUrl(url)) 1 else 0;
}

export fn satya_validate_uuid(str: [*:0]const u8) i32 {
    const uuid = std.mem.span(str);
    return if (validators_comp.validateUuid(uuid)) 1 else 0;
}

export fn satya_validate_ipv4(str: [*:0]const u8) i32 {
    const ip = std.mem.span(str);
    return if (validators_comp.validateIpv4(ip)) 1 else 0;
}

export fn satya_validate_base64(str: [*:0]const u8) i32 {
    const b64 = std.mem.span(str);
    return if (validators_comp.validateBase64(b64)) 1 else 0;
}

export fn satya_validate_iso_date(str: [*:0]const u8) i32 {
    const date = std.mem.span(str);
    return if (validators_comp.validateIsoDate(date)) 1 else 0;
}

export fn satya_validate_iso_datetime(str: [*:0]const u8) i32 {
    const datetime = std.mem.span(str);
    return if (validators_comp.validateIsoDatetime(datetime)) 1 else 0;
}

export fn satya_validate_contains(str: [*:0]const u8, substring: [*:0]const u8) i32 {
    const s = std.mem.span(str);
    const sub = std.mem.span(substring);
    return if (validators_comp.validateContains(s, sub)) 1 else 0;
}

export fn satya_validate_starts_with(str: [*:0]const u8, prefix: [*:0]const u8) i32 {
    const s = std.mem.span(str);
    const pre = std.mem.span(prefix);
    return if (validators_comp.validateStartsWith(s, pre)) 1 else 0;
}

export fn satya_validate_ends_with(str: [*:0]const u8, suffix: [*:0]const u8) i32 {
    const s = std.mem.span(str);
    const suf = std.mem.span(suffix);
    return if (validators_comp.validateEndsWith(s, suf)) 1 else 0;
}

// Number validators
export fn satya_validate_int_gt(value: i64, min: i64) i32 {
    return if (validators_comp.validateGt(i64, value, min)) 1 else 0;
}

export fn satya_validate_int_gte(value: i64, min: i64) i32 {
    return if (validators_comp.validateGte(i64, value, min)) 1 else 0;
}

export fn satya_validate_int_lt(value: i64, max: i64) i32 {
    return if (validators_comp.validateLt(i64, value, max)) 1 else 0;
}

export fn satya_validate_int_lte(value: i64, max: i64) i32 {
    return if (validators_comp.validateLte(i64, value, max)) 1 else 0;
}

export fn satya_validate_int_positive(value: i64) i32 {
    return if (validators_comp.validatePositive(i64, value)) 1 else 0;
}

export fn satya_validate_int_non_negative(value: i64) i32 {
    return if (validators_comp.validateNonNegative(i64, value)) 1 else 0;
}

export fn satya_validate_int_negative(value: i64) i32 {
    return if (validators_comp.validateNegative(i64, value)) 1 else 0;
}

export fn satya_validate_int_non_positive(value: i64) i32 {
    return if (validators_comp.validateNonPositive(i64, value)) 1 else 0;
}

export fn satya_validate_int_multiple_of(value: i64, divisor: i64) i32 {
    return if (validators_comp.validateMultipleOf(i64, value, divisor)) 1 else 0;
}

// Float validators
export fn satya_validate_float_gt(value: f64, min: f64) i32 {
    return if (validators_comp.validateGt(f64, value, min)) 1 else 0;
}

export fn satya_validate_float_finite(value: f64) i32 {
    return if (validators_comp.validateFinite(value)) 1 else 0;
}

// ============================================================================
// OPTIMIZED BATCH VALIDATION API
// ============================================================================

/// High-performance batch user validation (optimized fast path)
/// Validates arrays of names, emails, and ages in a single call
/// Returns number of valid users
export fn satya_validate_users_batch_optimized(
    names: [*]const [*:0]const u8,
    emails: [*]const [*:0]const u8,
    ages: [*]const i64,
    count: usize,
    name_min: usize,
    name_max: usize,
    age_min: i64,
    age_max: i64,
    results: [*]u8,
) usize {
    const validator_inst = batch.UserBatchValidator.init(name_min, name_max, age_min, age_max);
    
    const names_slice = names[0..count];
    const emails_slice = emails[0..count];
    const ages_slice = ages[0..count];
    const results_slice = results[0..count];
    
    return validator_inst.validateBatch(names_slice, emails_slice, ages_slice, results_slice);
}

/// Batch integer validation with SIMD optimization
export fn satya_validate_int_batch_simd(
    values: [*]const i64,
    count: usize,
    min: i64,
    max: i64,
    results: [*]u8,
) usize {
    const values_slice = values[0..count];
    const results_slice = results[0..count];
    return batch.validateIntBatchSIMD(values_slice, min, max, results_slice);
}

/// Batch string length validation
export fn satya_validate_string_length_batch(
    strings: [*]const [*:0]const u8,
    count: usize,
    min_len: usize,
    max_len: usize,
    results: [*]u8,
) usize {
    const strings_slice = strings[0..count];
    const results_slice = results[0..count];
    return batch.validateStringLengthBatch(strings_slice, min_len, max_len, results_slice);
}

/// Batch email validation
export fn satya_validate_email_batch(
    emails: [*]const [*:0]const u8,
    count: usize,
    results: [*]u8,
) usize {
    const emails_slice = emails[0..count];
    const results_slice = results[0..count];
    return batch.validateEmailBatch(emails_slice, results_slice);
}
