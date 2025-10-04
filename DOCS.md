# dhi Documentation

Complete API documentation for the fastest data validation library in Python.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [API Reference](#api-reference)
4. [Validators](#validators)
5. [Performance](#performance)
6. [Examples](#examples)
7. [Advanced Usage](#advanced-usage)

## Installation

### From PyPI (Recommended)

```bash
pip install dhi
```

**Requirements:**
- Python 3.9+
- macOS 13.0+ (Apple Silicon) or Linux x86_64

### From Source

```bash
git clone https://github.com/justrach/satya-zig.git
cd satya-zig
zig build -Doptimize=ReleaseFast
cd python-bindings
pip install -e .
```

## Quick Start

```python
from dhi import _dhi_native

# Define your data
users = [
    {"name": "Alice", "email": "alice@example.com", "age": 25},
    {"name": "Bob", "email": "bob@example.com", "age": 30},
]

# Define validation rules
field_specs = {
    'name': ('string', 2, 100),    # String: min 2, max 100 chars
    'email': ('email',),            # Email format
    'age': ('int_positive',),       # Positive integer
}

# Validate
results, valid_count = _dhi_native.validate_batch_direct(users, field_specs)

print(f"Valid: {valid_count}/{len(users)}")  # Valid: 2/2
print(f"Results: {results}")                  # [True, True]
```

## API Reference

### `validate_batch_direct(items, field_specs)`

Validates a batch of dictionaries against field specifications.

**Parameters:**
- `items` (list[dict]): List of dictionaries to validate
- `field_specs` (dict): Dictionary mapping field names to validator specifications

**Returns:**
- `tuple[list[bool], int]`: (results, valid_count)
  - `results`: List of booleans indicating validity of each item
  - `valid_count`: Number of valid items

**Example:**
```python
items = [{"age": 25}, {"age": -5}]
specs = {'age': ('int_positive',)}
results, count = _dhi_native.validate_batch_direct(items, specs)
# results = [True, False], count = 1
```

## Validators

### String Validators

#### `email`
Validates email format (RFC 5322 simplified).

```python
specs = {'email': ('email',)}
# Valid: "user@example.com"
# Invalid: "not-an-email", "@example.com", "user@"
```

#### `url`
Validates HTTP/HTTPS URLs.

```python
specs = {'website': ('url',)}
# Valid: "https://example.com", "http://site.io"
# Invalid: "not-a-url", "ftp://site.com"
```

#### `uuid`
Validates UUID v4 format (8-4-4-4-12).

```python
specs = {'id': ('uuid',)}
# Valid: "550e8400-e29b-41d4-a716-446655440000"
# Invalid: "not-a-uuid", "550e8400-e29b-41d4"
```

#### `ipv4`
Validates IPv4 addresses.

```python
specs = {'ip': ('ipv4',)}
# Valid: "192.168.1.1", "10.0.0.1"
# Invalid: "256.1.1.1", "192.168.1"
```

#### `base64`
Validates Base64 encoding.

```python
specs = {'data': ('base64',)}
# Valid: "SGVsbG8gV29ybGQ=", "YWJjMTIz"
# Invalid: "not base64!", "SGVsbG8@"
```

#### `iso_date`
Validates ISO 8601 date format (YYYY-MM-DD).

```python
specs = {'date': ('iso_date',)}
# Valid: "2024-01-15", "2023-12-31"
# Invalid: "2024-13-01", "24-01-15", "2024/01/15"
```

#### `iso_datetime`
Validates ISO 8601 datetime format.

```python
specs = {'timestamp': ('iso_datetime',)}
# Valid: "2024-01-15T10:30:00Z", "2024-01-15T10:30:00+00:00"
# Invalid: "2024-01-15 10:30:00", "2024-01-15"
```

#### `string`
Validates string length.

```python
specs = {'name': ('string', min_length, max_length)}
# Example: ('string', 2, 50) - between 2 and 50 chars
```

### Number Validators

#### `int`
Validates integer within range.

```python
specs = {'age': ('int', min_value, max_value)}
# Example: ('int', 18, 120) - between 18 and 120
```

#### `int_gt`
Validates integer greater than value.

```python
specs = {'score': ('int_gt', min_value)}
# Example: ('int_gt', 0) - must be > 0
```

#### `int_gte`
Validates integer greater than or equal to value.

```python
specs = {'count': ('int_gte', min_value)}
# Example: ('int_gte', 0) - must be >= 0
```

#### `int_lt`
Validates integer less than value.

```python
specs = {'percentage': ('int_lt', max_value)}
# Example: ('int_lt', 100) - must be < 100
```

#### `int_lte`
Validates integer less than or equal to value.

```python
specs = {'score': ('int_lte', max_value)}
# Example: ('int_lte', 100) - must be <= 100
```

#### `int_positive`
Validates positive integer (> 0).

```python
specs = {'age': ('int_positive',)}
# Valid: 1, 25, 100
# Invalid: 0, -5
```

#### `int_non_negative`
Validates non-negative integer (>= 0).

```python
specs = {'count': ('int_non_negative',)}
# Valid: 0, 1, 100
# Invalid: -1, -5
```

#### `int_multiple_of`
Validates integer is multiple of value.

```python
specs = {'quantity': ('int_multiple_of', divisor)}
# Example: ('int_multiple_of', 5) - must be divisible by 5
```

## Performance

### Throughput

**27.3 million validations/second** on Apple Silicon

```
Test: 10,000 users with 3 validators each
Time: 0.37ms
Throughput: 27,313,074 users/sec
```

### Comparison

| Library | Throughput | Speedup |
|---------|------------|---------|
| dhi | 27.3M/sec | 1.0x (baseline) |
| satya (Rust) | 9.6M/sec | 2.8x slower |
| msgspec (C) | 8.7M/sec | 3.1x slower |
| Pydantic | 0.2M/sec | 136x slower |

### Optimization Techniques

1. **Batch Processing** - Single FFI call for entire dataset
2. **Enum Dispatch** - No string comparisons in hot path
3. **Cached Lookups** - PyObject* pointers cached
4. **Zero Allocations** - Singleton bool reuse
5. **Branch Hints** - `__builtin_expect()` for predictable paths
6. **Inline Functions** - Critical Zig functions inlined

## Examples

### Basic Validation

```python
from dhi import _dhi_native

users = [{"name": "Alice", "age": 25}]
specs = {
    'name': ('string', 1, 100),
    'age': ('int_positive',),
}

results, count = _dhi_native.validate_batch_direct(users, specs)
```

### Multiple Validators

```python
data = [
    {
        "email": "user@example.com",
        "website": "https://example.com",
        "age": 25,
        "score": 95,
    }
]

specs = {
    'email': ('email',),
    'website': ('url',),
    'age': ('int', 18, 120),
    'score': ('int_lte', 100),
}

results, count = _dhi_native.validate_batch_direct(data, specs)
```

### Finding Invalid Items

```python
users = [
    {"name": "Alice", "age": 25},
    {"name": "X", "age": 15},      # Invalid: name too short, age < 18
    {"name": "Bob", "age": 30},
]

specs = {
    'name': ('string', 2, 100),
    'age': ('int', 18, 120),
}

results, count = _dhi_native.validate_batch_direct(users, specs)

# Find invalid indices
invalid_indices = [i for i, valid in enumerate(results) if not valid]
print(f"Invalid items at indices: {invalid_indices}")  # [1]
```

## Advanced Usage

### Performance Tuning

For maximum performance:

1. **Use batch validation** - Always validate in batches, not individually
2. **Pre-allocate lists** - Create user lists upfront
3. **Reuse field_specs** - Define once, use many times
4. **Early exit** - Validation stops at first invalid field per item

### Error Handling

```python
try:
    results, count = _dhi_native.validate_batch_direct(users, specs)
except TypeError as e:
    print(f"Invalid input: {e}")
except Exception as e:
    print(f"Validation error: {e}")
```

### Integration with Existing Code

```python
def validate_api_request(data: list[dict]) -> tuple[list[dict], list[dict]]:
    """Validate API request data, return valid and invalid items."""
    specs = {
        'name': ('string', 2, 100),
        'email': ('email',),
        'age': ('int_positive',),
    }
    
    results, valid_count = _dhi_native.validate_batch_direct(data, specs)
    
    valid_items = [item for item, valid in zip(data, results) if valid]
    invalid_items = [item for item, valid in zip(data, results) if not valid]
    
    return valid_items, invalid_items
```

### Benchmarking

```python
import time
from dhi import _dhi_native

# Generate test data
users = [
    {"name": f"User{i}", "email": f"user{i}@example.com", "age": 25}
    for i in range(10000)
]

specs = {
    'name': ('string', 1, 100),
    'email': ('email',),
    'age': ('int_positive',),
}

# Benchmark
start = time.perf_counter()
results, count = _dhi_native.validate_batch_direct(users, specs)
elapsed = time.perf_counter() - start

print(f"Validated {len(users)} users in {elapsed*1000:.2f}ms")
print(f"Throughput: {len(users)/elapsed:,.0f} users/sec")
print(f"Valid: {count}/{len(users)}")
```

## Troubleshooting

### Native Extension Not Loading

If you see "Using pure Python implementation (slower)":

1. Check Python version: `python --version` (need 3.9+)
2. Check platform: macOS 13.0+ (Apple Silicon) or Linux x86_64
3. Reinstall: `pip install --force-reinstall dhi`

### Performance Lower Than Expected

1. Ensure using batch validation, not individual calls
2. Check Python version (3.12+ recommended)
3. Verify native extension loaded: `from dhi import _dhi_native`
4. Run on Apple Silicon for best performance

## FAQ

**Q: Why is it so fast?**  
A: Pure Zig validators + C extension + batch processing + zero allocations

**Q: Does it work on Windows?**  
A: Not yet - macOS and Linux only. Windows support coming in v1.1.0

**Q: Can I use it with Pydantic?**  
A: Yes! Use dhi for high-throughput validation, Pydantic for ORM features

**Q: How do I add custom validators?**  
A: Custom validators coming in v1.1.0

**Q: Is it production-ready?**  
A: Yes! Thoroughly tested and benchmarked. Used in production systems.

## Support

- **GitHub Issues**: https://github.com/justrach/satya-zig/issues
- **Documentation**: https://github.com/justrach/satya-zig/blob/main/DOCS.md
- **PyPI**: https://pypi.org/project/dhi/

---

**Version**: 1.0.11  
**Performance**: 27.3M validations/sec  
**Status**: Production Ready 🚀
