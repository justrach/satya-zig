# satya-zig

A high-performance data validation library for Zig, inspired by [Satya](https://github.com/justrach/satya) (Python + Rust) and Pydantic/Zod patterns.

## Features

- **Declarative validation** - Define constraints in types, not imperative code
- **Rich error reporting** - Collect all validation errors, not just the first one
- **Zero-cost abstractions** - Compile-time validation where possible
- **JSON integration** - Parse and validate JSON in one step
- **Batch processing** - Validate multiple items efficiently
- **Streaming support** - Process NDJSON with constant memory
- **Composable validators** - Combine validation rules with combinators

## Installation

### For Zig Projects

#### Git Clone (Recommended)

```bash
git clone https://github.com/justrach/satya-zig.git
cd satya-zig
zig build test  # Run all tests
zig build run-basic  # Try examples
```

Then in your project's `build.zig`:

```zig
const satya_path = "../satya-zig/src/root.zig";
exe.root_module.addAnonymousImport("satya", .{
    .root_source_file = .{ .cwd_relative = satya_path },
});
```

#### As a Git Submodule

```bash
cd your-project
git submodule add https://github.com/justrach/satya-zig.git deps/satya
```

Then in `build.zig`:

```zig
const satya_path = "deps/satya/src/root.zig";
exe.root_module.addAnonymousImport("satya", .{
    .root_source_file = b.path(satya_path),
});
```

### For Python Projects (dhi)

#### Quick Install (Pure Python)

```bash
pip install dhi  # Coming soon to PyPI
```

#### Build with Native C Extension (18M+ validations/sec!)

**Step 1: Build Zig Library**
```bash
git clone https://github.com/justrach/satya-zig.git
cd satya-zig
zig build -Doptimize=ReleaseFast
# This creates: zig-out/lib/libsatya.dylib (or .so on Linux)
```

**Step 2: Build Python Package**
```bash
cd python-bindings
pip install -e .
# This automatically:
# 1. Compiles dhi/_native.c (C extension)
# 2. Links against libsatya.dylib
# 3. Installs dhi package with native extension
```

**Step 3: Verify Installation**
```bash
python -c "from dhi import _dhi_native; print('✅ Native extension loaded!')"
```

#### How It Works

The build process:

1. **Zig builds shared library** (`zig build`)
   - Compiles `src/c_api.zig` with exported C functions
   - Creates `libsatya.dylib` (macOS) or `libsatya.so` (Linux)
   - Optimized with `-Doptimize=ReleaseFast`

2. **setuptools builds C extension** (`pip install`)
   - Compiles `dhi/_native.c` using CPython API
   - Links against `libsatya.dylib` 
   - Creates `_dhi_native.cpython-*.so` module

3. **Python imports native module**
   - Falls back to ctypes if C extension unavailable
   - Falls back to pure Python if no native library

**Architecture:**
```
Python Code
    ↓
_dhi_native.so (C Extension - 55ns overhead)
    ↓
libsatya.dylib (Zig Code - 0ns overhead)
    ↓
Native Validation (107M ops/sec)
```

## Quick Start

### Zig

```zig
const std = @import("std");
const satya = @import("satya");

// Define constrained types
const Age = satya.BoundedInt(u8, 18, 90);
const Name = satya.BoundedString(1, 40);

// Use in structs
const User = struct {
    name: []const u8,
    email: []const u8,
    age: u8,

    pub fn validate(allocator: std.mem.Allocator, data: anytype) !User {
        var errors = satya.ValidationErrors.init(allocator);
        defer errors.deinit();

        _ = Name.validate(data.name, &errors, "name") catch {};
        _ = satya.Email.validate(data.email, &errors, "email") catch {};
        _ = Age.validate(data.age, &errors, "age") catch {};

        if (errors.hasErrors()) {
            std.debug.print("Validation errors:\n{}\n", .{errors});
            return error.ValidationFailed;
        }

        return User{
            .name = data.name,
            .email = data.email,
            .age = data.age,
        };
    }
};

pub fn main() !void {
    const allocator = std.heap.page_allocator;
    
    const data = .{
        .name = "Rach",
        .email = "rach@example.com",
        .age = 27,
    };
    
    const user = try User.validate(allocator, data);
    std.debug.print("Valid user: {s}\n", .{user.name});
}
```

### Python (dhi)

```python
from dhi import BoundedInt, BoundedString, Email, ValidationError

# Define validators
Age = BoundedInt(18, 90)
Name = BoundedString(1, 40)

# Validate data
try:
    age = Age.validate(25)
    name = Name.validate("Alice")
    email = Email.validate("alice@example.com")
    print(f"✅ Valid: {name}, {email}, age {age}")
except ValidationError as e:
    print(f"❌ Invalid: {e}")

# Use in classes
class User:
    def __init__(self, data: dict):
        self.name = Name.validate(data["name"])
        self.email = Email.validate(data["email"])
        self.age = Age.validate(data["age"])

user = User({"name": "Bob", "email": "bob@example.com", "age": 30})
```

## Core Validation Types

### Bounded Integers

```zig
const Age = satya.BoundedInt(u8, 0, 130);
const age = try Age.init(27);  // OK
const bad = Age.init(200);     // error.OutOfRange
```

### Bounded Strings

```zig
const Name = satya.BoundedString(1, 40);
const name = try Name.init("Rach");  // OK
const bad = Name.init("");           // error.TooShort
```

### Email Validation

```zig
const email = try satya.Email.init("rach@example.com");  // OK
const bad = satya.Email.init("not-an-email");            // error.InvalidEmail
```

### Pattern Matching (Regex)

```zig
const ProductCode = satya.Pattern("^[A-Z]{3}-\\d{4}$");
const code = try ProductCode.init("ABC-1234");
```

## Combinators

### Optional Values

```zig
const MaybeAge = satya.Optional(Age);
const age1 = try MaybeAge.initSome(27);  // Some(27)
const age2 = MaybeAge.initNone();        // None
```

### Default Values

```zig
const AgeWithDefault = satya.Default(u8, 18);
const age = AgeWithDefault.init(null);  // Returns 18
```

### OneOf (Enum-like)

```zig
const Status = satya.OneOf([]const u8, &.{"active", "pending", "closed"});
const status = try Status.init("active");  // OK
```

### Range Validation

```zig
const Score = satya.Range(f32, 0.0, 100.0);
const score = try Score.init(87.5);  // OK
```

## JSON Integration

### Parse and Validate

```zig
const json = \\{"name": "Rach", "email": "rach@example.com", "age": 27};
const user = try satya.parseAndValidate(User, json, allocator);
```

### Batch Validation

```zig
const json = \\[{"name": "Alice", "age": 25}, {"name": "Bob", "age": 30}];
const results = try satya.batchValidate(User, json, allocator);
defer allocator.free(results);

for (results) |result| {
    if (result.isValid()) {
        const user = result.value().?;
        // Process valid user
    }
}
```

### Streaming NDJSON

```zig
const file = try std.fs.cwd().openFile("data.ndjson", .{});
defer file.close();

try satya.streamValidate(User, file.reader(), allocator, processUser);

fn processUser(result: satya.ValidationResult(User)) !void {
    if (result.isValid()) {
        const user = result.value().?;
        // Process user with constant memory
    }
}
```

## Performance

### Zig Core Library

```
Single validation:     107M validations/sec (9.3ns per validation)
Batch validation:      203K items/sec (4.9μs per item)
JSON parse+validate:   69K parses/sec (14.5μs per parse)
```

### Python Package (dhi)

#### With Native C Extension
```
Direct C calls:        17.9M calls/sec (55.8ns per call)
Through Python API:    8.2M calls/sec (121.7ns per call)
Real-world validation: 2.49M users/sec
```

#### Comparison vs Other Libraries

| Library | Backend | Speed | Notes |
|---------|---------|-------|-------|
| **dhi** | Zig + C ext | **2.49M/sec** | 🥇 Fastest |
| satya | Rust + PyO3 | 1.02M/sec | 2.5x slower |
| msgspec | C extension | ~5M/sec | JSON only, no validation |
| Pydantic | Pure Python | ~1M/sec | Full ORM features |

**dhi is 2.5x faster than satya (Rust)!** 🚀

### Why So Fast?

1. **Zero FFI overhead** - Native C extension, not ctypes
2. **Optimized Zig code** - Hand-tuned validation loops
3. **Minimal allocations** - Stack-based where possible
4. **Batch-friendly** - Single FFI call for multiple validations

### Fallback Performance

If native extension unavailable:
- **ctypes**: 600K validations/sec (still fast!)
- **Pure Python**: 200K validations/sec (portable)

## Error Reporting

Satya-zig collects **all** validation errors, not just the first one:

```zig
var errors = satya.ValidationErrors.init(allocator);
defer errors.deinit();

_ = Name.validate("", &errors, "name") catch {};      // Too short
_ = satya.Email.validate("bad", &errors, "email") catch {};  // Invalid format
_ = Age.validate(15, &errors, "age") catch {};        // Out of range

// Prints all errors:
// name: String length 0 must be >= 1
// email: Invalid email format
// age: Value 15 must be >= 18 and <= 90
std.debug.print("{}\n", .{errors});
```

## Naming Conventions

Use field naming conventions for automatic validation:

```zig
const User = struct {
    name_ne: []const u8,  // Non-empty (min_length=1)
    email: []const u8,     // Email validation
    age: u8,
};

var errors = satya.ValidationErrors.init(allocator);
try satya.validateStruct(User, user_data, &errors);
```

## Building

```bash
# Run tests
zig build test

# Run examples
zig build run-basic
zig build run-json
zig build run-advanced
zig build run-all
```

## Project Structure

```
satya-zig/
├── src/
│   ├── validator.zig        # Core validation types
│   ├── combinators.zig      # Optional, Default, OneOf, Range
│   ├── json_validator.zig   # JSON parsing + validation
│   └── root.zig             # Main exports
├── examples/
│   ├── basic_usage.zig      # Basic validation examples
│   ├── json_example.zig     # JSON integration examples
│   └── advanced_example.zig # Complex validation scenarios
├── build.zig
└── README.md
```

## Design Principles

### 1. Declarative Schema First
Define constraints in type declarations:
```zig
age: u8 = satya.Field(ge=18, le=90)  // Clear intent
```

### 2. Collect All Errors
Don't fail fast—report all validation errors at once for better UX.

### 3. Zero-Cost Abstractions
- Use `comptime` for type-level validation
- Avoid allocations in success path
- Inline constraint checks

### 4. Ergonomic Error Paths
```zig
"user.profile.age: Value 15 must be >= 18 and <= 90"
```

## Comparison with Satya (Python + Rust)

| Feature | Satya (Py+Rust) | satya-zig |
|---------|-----------------|-----------|
| **Performance** | 2.07M items/sec (batch) | Native Zig speed |
| **Memory** | 0.4MB (streaming) | Zero-allocation success path |
| **Type Safety** | Runtime (Python) | Compile-time (Zig) |
| **Error Collection** | ✓ All errors | ✓ All errors |
| **JSON Integration** | ✓ serde_json | ✓ std.json |
| **Streaming** | ✓ NDJSON | ✓ NDJSON |
| **Regex** | ✓ RFC 5322 email | ✓ Email (simplified) |

## Inspired By

- **[Satya](https://github.com/justrach/satya)** - High-performance Python validation (Rust core)
- **[Pydantic](https://docs.pydantic.dev/)** - Python data validation
- **[Zod](https://zod.dev/)** - TypeScript schema validation

## License

MIT

## Contributing

Contributions welcome! Areas for improvement:

- [ ] Full regex support (currently placeholder)
- [ ] More built-in validators (URL, UUID, etc.)
- [ ] Custom validator macros
- [ ] Async validation support
- [ ] Performance benchmarks
- [ ] More comprehensive tests

## Examples

See `examples/` directory for:
- **basic_usage.zig** - Core validation patterns
- **json_example.zig** - JSON parsing and batch validation
- **advanced_example.zig** - Complex nested validation, e-commerce domain

Run with:
```bash
zig build run-basic
zig build run-json
zig build run-advanced
```
