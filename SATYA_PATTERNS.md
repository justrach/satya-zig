# Satya Validation Patterns - Reference for Zig Implementation

This document summarizes key patterns from [satya](https://github.com/justrach/satya) (Python + Rust validation library) that can inform a Zig validator design.

## Satya Overview

**Satya** is a high-performance Python data validation library powered by Rust that provides:
- **Pydantic-like API** with Rust performance (2-3x faster than Pydantic)
- **Streaming validation** with constant memory usage
- **Batch optimization** (2.07M items/sec with 1000-item batches)
- **Rich validation constraints** via RFC-compliant validators

### Architecture

```
Python API Layer (satya.Model, satya.Field)
        ↓
PyO3 Bindings (maturin build system)
        ↓
Rust Core (StreamValidatorCore, serde_json, regex)
```

## Core Validation Patterns

### 1. Field Constraints

Satya uses a `Field()` descriptor to declare validation rules:

```python
class User(satya.Model):
    # String constraints
    name: str = satya.Field(min_length=1, max_length=40)
    email: str = satya.Field(email=True)  # RFC 5322
    code: str = satya.Field(pattern=r"^[A-Z]{3}-\d{4}$")
    
    # Numeric constraints  
    age: int = satya.Field(ge=18, le=90)  # bounded int
    score: float = satya.Field(gt=0.0, lt=100.0)
    
    # Collection constraints
    tags: list[str] = satya.Field(min_items=1, max_items=10)
```

**Zig equivalent pattern:**
```zig
const User = struct {
    name: BoundedString(1, 40),
    email: Email,
    code: Pattern("^[A-Z]{3}-\\d{4}$"),
    age: BoundedInt(u8, 18, 90),
    tags: BoundedList([]const u8, 1, 10),
};
```

### 2. Error Reporting Structure

Satya uses a three-layer error model:

```python
# ValidationError dataclass
@dataclass
class ValidationError:
    field: str          # "age"
    message: str        # "Value must be >= 18"
    path: list[str]     # ["user", "profile", "age"] for nested

# ModelValidationError exception
class ModelValidationError(Exception):
    errors: list[ValidationError]
    
    def __str__(self):
        return "\n".join(f"{e.field}: {e.message}" for e in self.errors)
```

**Zig equivalent pattern:**
```zig
pub const ValidationError = struct {
    field: []const u8,
    message: []const u8,
    path: []const []const u8,
    
    pub fn format(self: ValidationError, ...) {
        // "user.profile.age: Value must be >= 18"
    }
};

pub const ValidationErrors = struct {
    errors: std.ArrayList(ValidationError),
    
    pub fn add(self: *ValidationErrors, field: []const u8, msg: []const u8) !void
};
```

### 3. Result-Based Validation

Satya provides both exception-based and result-based validation:

```python
# Exception-based (for single items)
try:
    user = User(name="", age=15)  # raises ModelValidationError
except ModelValidationError as e:
    print(e.errors)

# Result-based (for batch processing)
result = validator.validate(data)
if result.is_valid:
    user = result.value
else:
    for error in result.errors:
        print(f"{error.field}: {error.message}")
```

**Zig equivalent pattern:**
```zig
// Error union approach (idiomatic Zig)
pub fn validate(data: anytype) !User {
    var errors = ValidationErrors.init(allocator);
    defer errors.deinit();
    
    // Collect all errors, not just first
    var has_errors = false;
    
    if (data.age < 18) {
        try errors.add("age", "Must be >= 18");
        has_errors = true;
    }
    
    if (has_errors) return error.ValidationFailed;
    return User{ .age = data.age };
}

// Or result-style for batch
pub const ValidationResult = union(enum) {
    valid: User,
    invalid: []ValidationError,
};
```

### 4. Streaming & Batch Validation

Satya's performance comes from:
- **Batch processing**: Process 1000 items at once (3.3x speedup)
- **Streaming support**: Validate NDJSON with constant memory
- **Zero-copy parsing**: serde_json directly to typed structs

```python
# Batch validation
results = validator.validate_batch(items)  # List[ValidationResult]

# Streaming validation (NDJSON)
for result in validator.validate_stream(ndjson_file):
    if result.is_valid:
        process(result.value)
```

**Zig equivalent pattern:**
```zig
// Batch with arena allocator
pub fn validateBatch(items: []const []const u8) ![]ValidationResult {
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    
    var results = try std.ArrayList(ValidationResult).initCapacity(arena.allocator(), items.len);
    for (items) |item| {
        results.appendAssumeCapacity(validate(item));
    }
    return results.toOwnedSlice();
}

// Streaming with std.json.reader
pub fn validateStream(reader: anytype) !void {
    var buffered = std.io.bufferedReader(reader);
    var json_reader = std.json.reader(allocator, buffered.reader());
    
    while (try json_reader.next()) |token| {
        const result = validate(token);
        // Process result...
    }
}
```

## Key Design Principles from Satya

### 1. **Declarative Schema First**
Define constraints in type declarations, not imperative validation code:
```python
age: int = Field(ge=18, le=90)  # ✓ Clear intent
```

### 2. **Collect All Errors**
Don't fail fast—report all validation errors at once:
```python
errors = [
    ValidationError("age", "Must be >= 18", ["user", "age"]),
    ValidationError("email", "Invalid format", ["user", "email"]),
]
```

### 3. **Zero-Cost Abstractions**
- Use comptime for type-level validation
- Avoid allocations in success path
- Inline constraint checks

### 4. **Ergonomic Error Paths**
```python
# Clear error messages with field paths
"user.profile.age: Value 15 must be >= 18 and <= 90"
```

## Satya Performance Characteristics

| Operation | Throughput | Notes |
|-----------|------------|-------|
| Single item | 637K items/sec | Interactive validation |
| Batch (1000) | 2.07M items/sec | High-throughput processing |
| JSON streaming | 3.2M items/sec | Constant memory (0.4MB) |

**Key optimizations:**
- Rust core with serde_json (no Python object creation)
- Batch processing to amortize FFI overhead
- Regex compilation caching
- Arena allocation for temporary data

## Validation Constraint Types

### Strings
- `min_length`, `max_length`: Length bounds
- `email=True`: RFC 5322 email validation
- `url=True`: URL format validation  
- `pattern`: Custom regex (compiled once)

### Numeric
- `ge`, `le`: Greater/less than or equal (inclusive)
- `gt`, `lt`: Greater/less than (exclusive)
- `min_value`, `max_value`: Alternative names

### Collections
- `min_items`, `max_items`: Length constraints
- `unique_items=True`: No duplicates
- Nested model validation

## Zig Implementation Roadmap

Based on satya's design, here's a practical path for Zig:

### Phase 1: Core Primitives
```zig
pub fn BoundedInt(comptime T: type, comptime min: T, comptime max: T) type
pub fn BoundedString(comptime min_len: usize, comptime max_len: usize) type
pub const Email = ...;  // RFC 5322 regex
pub const Url = ...;
```

### Phase 2: Error Reporting
```zig
pub const ValidationError = struct { field, message, path };
pub const ValidationErrors = struct { ArrayList(ValidationError) };
```

### Phase 3: Struct Derivation
```zig
pub fn validate(comptime T: type, data: anytype) !T {
    // Use @typeInfo to walk struct fields
    // Apply constraint checks based on field type
    // Collect errors, not fail-fast
}
```

### Phase 4: Combinators
```zig
pub fn Optional(comptime T: type) type  // ?T with validation
pub fn OneOf(comptime types: []const type) type  // Union validation
pub fn Transform(comptime T: type, comptime fn) type  // Coercion
```

### Phase 5: JSON Integration
```zig
pub fn parseAndValidate(comptime T: type, json: []const u8) !T {
    const parsed = try std.json.parseFromSlice(...);
    return try validate(T, parsed.value);
}
```

## References

- **Satya Repository**: https://github.com/justrach/satya
- **DeepWiki**: https://deepwiki.com/justrach/satya
- **Key Files**:
  - `src/satya/__init__.py`: Python API
  - `src/lib.rs`: Rust core validation logic
  - `Cargo.toml`: serde_json, regex dependencies
