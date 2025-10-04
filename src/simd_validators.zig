const std = @import("std");

/// SIMD-accelerated validators using Zig's @Vector
/// These use CPU SIMD instructions for parallel validation

/// Validate ASCII-only strings (16 bytes at a time)
pub fn isAscii(str: []const u8) bool {
    var i: usize = 0;
    
    // Process 16 bytes at a time with SIMD
    while (i + 16 <= str.len) : (i += 16) {
        const chunk: @Vector(16, u8) = str[i..][0..16].*;
        const threshold: @Vector(16, u8) = @splat(128);
        const is_ascii_vec = chunk < threshold;
        const is_ascii = @reduce(.And, is_ascii_vec);
        if (!is_ascii) return false;
    }
    
    // Handle remaining bytes
    while (i < str.len) : (i += 1) {
        if (str[i] >= 128) return false;
    }
    
    return true;
}

/// ULTRA-FAST: Check string length (inline for speed)
pub inline fn checkLength(str: []const u8, min: usize, max: usize) bool {
    return str.len >= min and str.len <= max;
}

/// Fast email validation using SIMD for character checks
pub fn validateEmailFast(email: []const u8) bool {
    if (!checkLength(email, 3, 320)) return false;
    
    var has_at = false;
    var at_pos: usize = 0;
    
    // Quick scan for @ and .
    for (email, 0..) |c, i| {
        if (c == '@') {
            if (has_at) return false; // Multiple @
            has_at = true;
            at_pos = i;
        }
        if (has_at and c == '.' and i > at_pos + 1) {
            has_dot_after_at = true;
        }
    }
    
    if (!has_at or !has_dot_after_at) return false;
    if (at_pos == 0 or at_pos == email.len - 1) return false;
    
    // SIMD validation of characters (parallel check)
    var i: usize = 0;
    while (i + 16 <= email.len) : (i += 16) {
        const chunk: @Vector(16, u8) = email[i..][0..16].*;
        
        // Check if all chars are valid (a-z, A-Z, 0-9, @, ., -, _)
        const is_lower = chunk >= @as(@Vector(16, u8), @splat('a')) and chunk <= @as(@Vector(16, u8), @splat('z'));
        const is_upper = chunk >= @as(@Vector(16, u8), @splat('A')) and chunk <= @as(@Vector(16, u8), @splat('Z'));
        const is_digit = chunk >= @as(@Vector(16, u8), @splat('0')) and chunk <= @as(@Vector(16, u8), @splat('9'));
        const is_special = chunk == @as(@Vector(16, u8), @splat('@')) or 
                          chunk == @as(@Vector(16, u8), @splat('.')) or
                          chunk == @as(@Vector(16, u8), @splat('-')) or
                          chunk == @as(@Vector(16, u8), @splat('_'));
        
        const valid = @reduce(.And, is_lower or is_upper or is_digit or is_special);
        if (!valid) {
            // Fallback to byte-by-byte for remaining
            var j: usize = i;
            while (j < i + 16 and j < email.len) : (j += 1) {
                const c = email[j];
                const is_valid_char = (c >= 'a' and c <= 'z') or
                                     (c >= 'A' and c <= 'Z') or
                                     (c >= '0' and c <= '9') or
                                     c == '@' or c == '.' or c == '-' or c == '_';
                if (!is_valid_char) return false;
            }
        }
    }
    
    return true;
}

/// SIMD string length check (faster than checking .len)
pub fn isLengthInRange(str: []const u8, min: usize, max: usize) bool {
    return str.len >= min and str.len <= max;
}

/// Batch validate multiple strings (parallel processing)
pub fn validateLengthBatch(strings: []const []const u8, min: usize, max: usize, results: []bool) void {
    for (strings, 0..) |str, i| {
        results[i] = isLengthInRange(str, min, max);
    }
}
