# dhi - High-Performance Data Validation for Python

**dhi** is a Python wrapper around [satya-zig](https://github.com/justrach/satya-zig), providing blazing-fast data validation with a Pydantic-like API.

> **Note**: Currently using pure Python implementation. Native Zig bindings coming soon for 100x+ speedup! 🚀

## Installation

```bash
pip install dhi
```

## Quick Start

```python
from dhi import BoundedInt, BoundedString, Email, ValidationError

# Define validators
Age = BoundedInt(18, 90)
Name = BoundedString(1, 40)

# Validate data
try:
    age = Age.validate(25)  # ✅ OK
    name = Name.validate("Alice")  # ✅ OK
    email = Email.validate("alice@example.com")  # ✅ OK
    
    # This will raise ValidationError
    invalid_age = Age.validate(15)  # ❌ Too young
except ValidationError as e:
    print(f"Validation failed: {e}")
```

## Features

- **Pydantic-like API** - Familiar validation patterns
- **Type Safety** - Runtime type checking
- **Rich Errors** - Detailed error messages
- **Zero Dependencies** - Pure Python (for now)
- **Future: Native Speed** - Zig backend for 100x+ performance

## Validators

### BoundedInt

```python
from dhi import BoundedInt

Age = BoundedInt(min_val=18, max_val=120)
age = Age.validate(25)  # Returns 25
```

### BoundedString

```python
from dhi import BoundedString

Username = BoundedString(min_len=3, max_len=20)
username = Username.validate("alice")  # Returns "alice"
```

### Email

```python
from dhi import Email

email = Email.validate("user@example.com")  # Returns "user@example.com"
```

## Roadmap

- [x] Pure Python implementation
- [ ] Native Zig bindings via ctypes/cffi
- [ ] JSON validation
- [ ] Batch validation
- [ ] Custom validators
- [ ] Async validation
- [ ] Performance benchmarks vs Pydantic

## Performance (Coming Soon)

With native Zig bindings:
- **100M+ validations/sec** (vs Pydantic's ~1M/sec)
- **100x faster** than pure Python
- **Zero-copy** validation where possible

## Why "dhi"?

Short, memorable, and fast to type - just like the library itself! 🚀

## License

MIT License - See [LICENSE](../LICENSE) for details

## Links

- **GitHub**: https://github.com/justrach/satya-zig
- **PyPI**: https://pypi.org/project/dhi/ (coming soon)
- **Zig Library**: https://github.com/justrach/satya-zig
