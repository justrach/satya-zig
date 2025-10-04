/// C API for Python bindings
const std = @import("std");
const validator = @import("validator.zig");

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
