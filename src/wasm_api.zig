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

// Optimized batch validation - validates multiple fields across multiple items
// Format: [num_fields][field1_type][field1_param1][field1_param2]...[item_count][item_data...]
// Returns pointer to boolean array (one bool per item)
export fn validate_batch_optimized(
    spec_ptr: [*]const u8,
    spec_len: usize,
    items_ptr: [*]const u8,
    items_len: usize,
) ?[*]u8 {
    _ = spec_len;
    
    // Parse field specs (cached on JS side, passed once)
    var offset: usize = 0;
    const num_fields = spec_ptr[offset];
    offset += 1;
    
    // Allocate space for field specs
    const field_specs = std.heap.wasm_allocator.alloc(FieldSpec, num_fields) catch return null;
    defer std.heap.wasm_allocator.free(field_specs);
    
    // Parse each field spec
    for (0..num_fields) |i| {
        field_specs[i].validator_type = spec_ptr[offset];
        offset += 1;
        field_specs[i].param1 = @as(i32, @bitCast([4]u8{
            spec_ptr[offset],
            spec_ptr[offset + 1],
            spec_ptr[offset + 2],
            spec_ptr[offset + 3],
        }));
        offset += 4;
        field_specs[i].param2 = @as(i32, @bitCast([4]u8{
            spec_ptr[offset],
            spec_ptr[offset + 1],
            spec_ptr[offset + 2],
            spec_ptr[offset + 3],
        }));
        offset += 4;
    }
    
    // Parse item count
    const item_count = @as(u32, @bitCast([4]u8{
        items_ptr[0],
        items_ptr[1],
        items_ptr[2],
        items_ptr[3],
    }));
    
    // Allocate results
    const results = std.heap.wasm_allocator.alloc(u8, item_count) catch return null;
    
    // Initialize all to valid
    for (0..item_count) |i| {
        results[i] = 1;
    }
    
    // Validate each item
    var item_offset: usize = 4;
    for (0..item_count) |item_idx| {
        // For each field in this item
        for (field_specs) |spec| {
            // Read field data length
            if (item_offset + 4 > items_len) break;
            const field_len = @as(u32, @bitCast([4]u8{
                items_ptr[item_offset],
                items_ptr[item_offset + 1],
                items_ptr[item_offset + 2],
                items_ptr[item_offset + 3],
            }));
            item_offset += 4;
            
            if (item_offset + field_len > items_len) break;
            const field_data = items_ptr[item_offset..item_offset + field_len];
            item_offset += field_len;
            
            // Validate field (early exit on failure)
            const is_valid = validateField(field_data, spec);
            if (!is_valid) {
                results[item_idx] = 0;
                // Skip remaining fields for this item
                break;
            }
        }
    }
    
    return results.ptr;
}

const FieldSpec = struct {
    validator_type: u8,
    param1: i32,
    param2: i32,
};

inline fn validateField(data: []const u8, spec: FieldSpec) bool {
    return switch (spec.validator_type) {
        0 => validators.validateEmail(data),
        1 => validators.validateUrl(data),
        2 => validators.validateUuid(data),
        3 => validators.validateIpv4(data),
        4 => validators.validateIsoDate(data),
        5 => validators.validateIsoDatetime(data),
        6 => validators.validateBase64(data),
        7 => data.len >= @as(usize, @intCast(spec.param1)) and data.len <= @as(usize, @intCast(spec.param2)), // string length
        8 => blk: { // positive number
            const num = std.fmt.parseInt(i64, data, 10) catch break :blk false;
            break :blk validators.validatePositive(i64, num);
        },
        else => false,
    };
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
