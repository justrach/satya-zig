# Agent Context: dhi - Ultra-Fast Data Validation

This document provides context for AI agents working with the dhi project.

## Project Overview

**dhi** is the fastest data validation library for Python, achieving **27.3 million validations/second** - 2.8x faster than Rust alternatives and 3.1x faster than C implementations.

### Key Facts

- **Language**: Zig (core) + C extension (Python bindings)
- **Performance**: 27.3M validations/sec on Apple Silicon
- **Validators**: 24 comprehensive validators (Pydantic + Zod feature parity)
- **Status**: Production-ready, published on PyPI
- **License**: MIT

## Architecture

```
Python Code
    ↓
_dhi_native.cpython-*.so (C Extension)
    ↓
libsatya.dylib (Zig Library)
    ↓
Pure Zig Validators (27M ops/sec)
```

### Components

1. **Zig Core** (`src/`)
   - `validators_comprehensive.zig` - All 24 validators
   - `c_api.zig` - C API exports
   - `json_batch_validator.zig` - JSON validation

2. **Python Bindings** (`python-bindings/`)
   - `dhi/_native.c` - Optimized C extension
   - `dhi/batch.py` - Python wrapper
   - `dhi/validator.py` - Pure Python fallback

3. **JavaScript Bindings** (`js-bindings/`) - In development
   - Bun/Node.js bindings
   - Target: Compete with Zod v4

## Performance Characteristics

### Throughput

| Test | Throughput | Time |
|------|------------|------|
| 10K users, 3 validators | 27.3M users/sec | 0.37ms |
| 10K integers | 39.0M values/sec | 0.26ms |

### vs Competition

| Library | Backend | Throughput | Speedup |
|---------|---------|------------|---------|
| **dhi** | Zig + C | 27.3M/sec | 1.0x (baseline) |
| satya | Rust + PyO3 | 9.6M/sec | 2.8x slower |
| msgspec | C | 8.7M/sec | 3.1x slower |
| Pydantic | Python+Rust | 0.2M/sec | 136x slower |

### Optimization Techniques

1. **Batch Processing** - Single FFI call for entire dataset (9.2x speedup)
2. **Enum Dispatch** - No string comparisons in hot path
3. **Cached PyObject* Lookups** - Direct hash table access (2.2x speedup)
4. **Singleton Bool Reuse** - Zero allocations for results
5. **Branch Prediction Hints** - `__builtin_expect()` for common paths
6. **Inline Zig Functions** - Critical paths inlined

## Validators

### String Validators (12)
- `email` - RFC 5322 simplified
- `url` - HTTP/HTTPS only
- `uuid` - v4 format (8-4-4-4-12)
- `ipv4` - IPv4 addresses
- `base64` - Base64 encoding
- `iso_date` - YYYY-MM-DD
- `iso_datetime` - ISO 8601
- `string` - Length validation
- `contains` - Substring check
- `starts_with` - Prefix check
- `ends_with` - Suffix check
- `pattern` - Regex (placeholder)

### Number Validators (10)
- `int` - Range validation
- `int_gt` - Greater than
- `int_gte` - Greater than or equal
- `int_lt` - Less than
- `int_lte` - Less than or equal
- `int_positive` - > 0
- `int_non_negative` - >= 0
- `int_negative` - < 0
- `int_non_positive` - <= 0
- `int_multiple_of` - Divisibility

### Float Validators (2)
- `float_gt` - Greater than
- `float_finite` - Not NaN/Inf

## API Usage

### Python

```python
from dhi import _dhi_native

users = [{"name": "Alice", "email": "alice@example.com", "age": 25}]
specs = {
    'name': ('string', 2, 100),
    'email': ('email',),
    'age': ('int_positive',),
}

results, valid_count = _dhi_native.validate_batch_direct(users, specs)
# results = [True], valid_count = 1
```

### Field Spec Format

```python
field_specs = {
    'field_name': (validator_type, *params),
}

# Examples:
{'email': ('email',)}                    # No params
{'age': ('int', 18, 120)}               # Min, max
{'name': ('string', 2, 50)}             # Min length, max length
{'score': ('int_lte', 100)}             # Max value
```

## Build System

### Zig Library

```bash
zig build -Doptimize=ReleaseFast
# Creates: zig-out/lib/libsatya.dylib (or .so)
```

### Python Package

```bash
cd python-bindings
pip install -e .
# Compiles C extension and links against libsatya
```

### GitHub Actions

Automated wheel building for:
- macOS 13.0+ (Apple Silicon)
- Linux x86_64
- Python 3.9-3.13

## Development Workflow

### Adding a New Validator

1. **Add to Zig** (`src/validators_comprehensive.zig`):
```zig
pub inline fn validateNewThing(value: []const u8) bool {
    // Implementation
    return true;
}
```

2. **Export in C API** (`src/c_api.zig`):
```zig
export fn satya_validate_new_thing(value: [*:0]const u8) bool {
    return validators.validateNewThing(std.mem.span(value));
}
```

3. **Add to C extension** (`python-bindings/dhi/_native.c`):
```c
// Add to enum
enum ValidatorType {
    // ...
    VAL_NEW_THING,
};

// Add to parser
case 'n':
    if (strcmp(type_str, "new_thing") == 0) return VAL_NEW_THING;

// Add to switch
case VAL_NEW_THING: {
    const char* value = PyUnicode_AsUTF8(field_value);
    is_valid = satya_validate_new_thing(value);
    break;
}
```

4. **Rebuild**:
```bash
zig build -Doptimize=ReleaseFast
cd python-bindings && pip install -e . --force-reinstall
```

### Running Tests

```bash
# Zig tests
zig build test

# Python benchmarks
cd python-bindings
python benchmark_batch.py

# Comprehensive validator tests
python test_comprehensive_validators.py
```

## Common Issues

### Performance Lower Than Expected

**Symptoms**: Getting <10M validations/sec

**Causes**:
1. Not using batch validation
2. Python 3.8 or older
3. Not on Apple Silicon
4. Native extension not loaded

**Solutions**:
1. Always use `validate_batch_direct()`, not individual calls
2. Upgrade to Python 3.12+
3. Use Apple Silicon Mac or Linux x86_64
4. Check: `from dhi import _dhi_native` (should not error)

### Build Failures

**Symptoms**: C extension compilation fails

**Causes**:
1. Zig library not built
2. Wrong library path
3. Architecture mismatch

**Solutions**:
1. Run `zig build -Doptimize=ReleaseFast` first
2. Check `zig-out/lib/libsatya.dylib` exists
3. Ensure matching architecture (arm64 or x86_64)

## Future Roadmap

### v1.1.0 (Next Release)
- [ ] Windows support
- [ ] Intel Mac (x86_64) wheels
- [ ] Custom validator support
- [ ] Better error messages with field paths

### v1.2.0
- [ ] JSON validation API
- [ ] Async validation
- [ ] Schema composition
- [ ] Nested object validation

### v2.0.0
- [ ] JavaScript/TypeScript bindings (Bun/Node.js)
- [ ] Compete with Zod v4
- [ ] WASM support
- [ ] GraphQL schema validation

## Key Files

### Documentation
- `README.md` - Main documentation
- `DOCS.md` - Comprehensive API docs
- `AGENT.md` - This file (LLM context)
- `COMPREHENSIVE_VALIDATORS.md` - All validators
- `SESSION_SUMMARY.md` - Performance optimization journey

### Source Code
- `src/validators_comprehensive.zig` - Core validators
- `src/c_api.zig` - C API exports
- `python-bindings/dhi/_native.c` - C extension
- `python-bindings/dhi/batch.py` - Python API

### Build & CI
- `build.zig` - Zig build configuration
- `python-bindings/setup.py` - Python package build
- `python-bindings/pyproject.toml` - Package metadata
- `.github/workflows/build-wheels.yml` - CI/CD

### Benchmarks
- `python-bindings/benchmark_batch.py` - Main benchmarks
- `python-bindings/benchmark_vs_all.py` - vs competition
- `python-bindings/create_graph.py` - Performance graphs

## Design Principles

1. **Performance First** - Every optimization counts
2. **Zero Allocations** - Success path should not allocate
3. **Batch Everything** - Single FFI call for datasets
4. **Fail Fast** - Stop at first invalid field per item
5. **Type Safety** - Compile-time guarantees where possible
6. **Simple API** - Easy to use, hard to misuse

## Benchmarking Guidelines

### Accurate Benchmarks

```python
import time

# Warmup (JIT, caches)
for _ in range(10):
    _dhi_native.validate_batch_direct(users, specs)

# Measure
times = []
for _ in range(100):
    start = time.perf_counter()
    results, count = _dhi_native.validate_batch_direct(users, specs)
    times.append(time.perf_counter() - start)

# Report median (more stable than mean)
median_time = sorted(times)[len(times)//2]
throughput = len(users) / median_time
print(f"Throughput: {throughput:,.0f} users/sec")
```

### What to Measure

1. **Throughput** - Items/sec for large batches (10K+)
2. **Latency** - Time per item for small batches (1-100)
3. **Scaling** - How performance changes with batch size
4. **Comparison** - vs satya, msgspec, Pydantic

## Contributing

### Code Style

**Zig**:
- Use `inline` for hot path functions
- Prefer stack allocation
- Document with `///` comments

**C**:
- Use `__builtin_expect()` for branch hints
- Cache PyObject* pointers
- Minimize allocations

**Python**:
- Type hints for all public APIs
- Docstrings with examples
- Follow PEP 8

### Pull Request Process

1. Add tests for new validators
2. Update DOCS.md with API changes
3. Run benchmarks before/after
4. Update COMPREHENSIVE_VALIDATORS.md

## Contact

- **GitHub**: https://github.com/justrach/satya-zig
- **PyPI**: https://pypi.org/project/dhi/
- **Issues**: https://github.com/justrach/satya-zig/issues

---

**Version**: 1.0.11  
**Performance**: 27.3M validations/sec  
**Status**: Production Ready  
**Last Updated**: 2025-10-04
