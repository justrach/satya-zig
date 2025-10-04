# Satya-Zig v0.1.0 - Release Notes

## 🎉 First Release - Zig 0.15.1 Compatible

**Satya** is a high-performance data validation library for Zig, inspired by Python's Pydantic and TypeScript's Zod.

### ✨ Features

- **Declarative Validation** - Define constraints in types, not imperative code
- **Rich Error Reporting** - Collect all validation errors, not just the first one
- **Zero-Cost Abstractions** - Compile-time validation where possible
- **JSON Integration** - Parse and validate JSON in one step
- **Batch Processing** - Validate multiple items efficiently
- **Streaming Support** - Process NDJSON with constant memory
- **Composable Validators** - Combine validation rules with combinators

### 📊 Performance

- **107M+ validations/sec** for simple types
- **203K items/sec** for batch validation
- **69K parses/sec** for JSON parse + validate

### 🧪 Test Coverage

- ✅ **33/33 tests passing**
- ✅ All examples working (basic, JSON, advanced)
- ✅ Benchmarks running successfully

### 📦 Installation

```bash
git clone https://github.com/justrach/satya-zig.git
cd satya-zig
zig build test
```

### 🔧 Zig 0.15.1 Compatibility Changes

This release includes full compatibility with Zig 0.15.1:

- Updated `build.zig` for new Build API (`addLibrary`, `createModule`)
- Fixed `ArrayList` API changes (`init` → `empty`, explicit allocator)
- Updated `@typeInfo` enum tags (`.Struct` → `.@"struct"`)
- Fixed format method signatures for `{f}` specifier
- Updated `std.io` buffered reader API

### 🚀 Future Plans

See [TODO.md](TODO.md) for the roadmap, including:

- **Python bindings** via ctypes/cffi
- **TypeScript/WASM** wrapper for browser/Node.js
- **Performance improvements** and memory leak fixes
- **Enhanced features** (regex, custom errors, nested validation)

### 📝 Example Usage

```zig
const std = @import("std");
const satya = @import("satya");

const Age = satya.BoundedInt(u8, 18, 90);
const Email = satya.Email;

const User = struct {
    name: []const u8,
    email: []const u8,
    age: u8,
};

// Validate JSON in one step
const json = "{\"name\":\"Alice\",\"email\":\"alice@example.com\",\"age\":25}";
const user = try satya.parseAndValidate(User, json, allocator);
```

### 🙏 Acknowledgments

Inspired by:
- [Satya](https://github.com/justrach/satya) (Python + Rust)
- [Pydantic](https://github.com/pydantic/pydantic) (Python)
- [Zod](https://github.com/colinhacks/zod) (TypeScript)

### 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

**Repository**: https://github.com/justrach/satya-zig  
**Author**: [@justrach](https://github.com/justrach)  
**Zig Version**: 0.15.1+
