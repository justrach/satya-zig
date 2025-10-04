# Satya-Zig TODO

## 🚀 Future Enhancements

### Language Bindings

#### Python Wrapper (High Priority)
- [ ] Create Python bindings using `ctypes` or `cffi`
- [ ] Expose core validation functions to Python
- [ ] Package as `satya-zig-py` on PyPI
- [ ] Write Python examples showing interop
- [ ] Benchmark against Pydantic for performance comparison
- [ ] Consider using `zig build-lib -dynamic` for shared library

**Approach:**
```bash
# Build shared library
zig build-lib src/root.zig -dynamic -OReleaseFast

# Python wrapper example
import ctypes
satya = ctypes.CDLL('./libsatya.so')
# Define function signatures and call from Python
```

#### TypeScript/JavaScript Wrapper (Medium Priority)
- [ ] Create WASM build target for browser/Node.js
- [ ] Use `zig build-lib -target wasm32-freestanding`
- [ ] Write TypeScript type definitions
- [ ] Package as `@satya/zig` on npm
- [ ] Create Zod-like API for TypeScript users
- [ ] Add examples for Next.js/React integration

**Approach:**
```bash
# Build WASM module
zig build-lib src/root.zig -target wasm32-freestanding -dynamic -rdynamic

# TypeScript wrapper
import { instantiate } from './satya.wasm';
export const validate = (data: unknown) => { /* ... */ };
```

#### Rust FFI (Low Priority)
- [ ] Create C-compatible API layer
- [ ] Generate Rust bindings with `bindgen`
- [ ] Publish as `satya-zig` crate on crates.io

### Core Library Improvements

#### Memory Management
- [ ] Fix memory leaks in JSON validator tests (6 leaks currently)
- [ ] Add `deinit()` calls for parsed JSON strings
- [ ] Implement arena allocator option for batch operations

#### Performance
- [ ] Add more comprehensive benchmarks
- [ ] Profile hot paths with `perf`
- [ ] Optimize JSON parsing for large payloads
- [ ] Add SIMD optimizations for string validation

#### Features
- [ ] Add regex pattern validation (currently uses simple pattern matching)
- [ ] Implement custom error messages per validator
- [ ] Add field-level metadata/tags support
- [ ] Create derive macro equivalent for auto-validation
- [ ] Support for nested struct validation
- [ ] Add async validation support

### Documentation
- [ ] Add API reference documentation
- [ ] Create video tutorial/walkthrough
- [ ] Write blog post comparing to Pydantic/Zod
- [ ] Add more real-world examples (REST API, CLI tools)
- [ ] Document performance characteristics

### Ecosystem
- [ ] Submit to Zig package index (when .zon format stabilizes)
- [ ] Create GitHub Actions CI/CD pipeline
- [ ] Add code coverage reporting
- [ ] Set up automated benchmarking
- [ ] Create project website/landing page

### Testing
- [ ] Increase test coverage to 95%+
- [ ] Add property-based testing with QuickCheck-style framework
- [ ] Add fuzzing tests for JSON parser
- [ ] Test on multiple platforms (Linux, macOS, Windows)

## 📝 Notes

- Current version: **0.1.0**
- Zig version: **0.15.1+**
- All 33 tests passing ✅
- Performance: **107M+ validations/sec** 🚀

## 🎯 Immediate Next Steps

1. Fix JSON validator memory leaks
2. Create Python bindings proof-of-concept
3. Set up CI/CD pipeline
4. Write comprehensive API documentation
