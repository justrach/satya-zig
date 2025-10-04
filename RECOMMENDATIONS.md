# Recommendations: Next Steps for dhi

Based on the benchmark analysis, here are concrete recommendations to improve dhi and make it more competitive.

## 🎯 Priority 1: Add Batch Validation API

### Current Limitation

dhi requires 3 FFI calls per user:
```python
for user in users:
    Name.validate(user["name"])    # FFI call 1
    Email.validate(user["email"])  # FFI call 2
    Age.validate(user["age"])      # FFI call 3
```

For 10,000 users = 30,000 FFI crossings = significant overhead

### Proposed Solution

Add a batch validation API:

```python
from dhi import BoundedInt, BoundedString, Email, validate_batch

# Define schema
schema = {
    "name": BoundedString(1, 100),
    "email": Email,
    "age": BoundedInt(18, 90),
}

# Validate entire array in one FFI call
results = validate_batch(users, schema)
# Returns: List[ValidationResult]
```

### Implementation Plan

1. **Add C API function** in `src/c_api.zig`:
   ```zig
   export fn satya_validate_batch(
       data_ptr: [*]const u8,
       data_len: usize,
       schema_ptr: [*]const SchemaField,
       schema_len: usize,
       results_ptr: [*]ValidationResult,
   ) c_int
   ```

2. **Add Python wrapper** in `dhi/__init__.py`:
   ```python
   def validate_batch(items: List[dict], schema: dict) -> List[ValidationResult]:
       # Single FFI call to validate all items
       pass
   ```

3. **Expected Performance**:
   - Current: 4.32M users/sec (30K FFI calls)
   - With batch: ~10-15M users/sec (1 FFI call)
   - **2-3x improvement**

## 🎯 Priority 2: Add JSON Integration

### Current Limitation

dhi doesn't handle JSON parsing:
```python
# User must parse JSON first
import json
data = json.loads(json_string)
for item in data:
    validate(item)  # Then validate
```

### Proposed Solution

Add JSON validation API:

```python
from dhi import UserSchema

# Parse + validate in one step (in Zig)
results = UserSchema.validate_json_array(json_bytes)
```

### Implementation Plan

1. **Use Zig's std.json** in `src/json_validator.zig`:
   ```zig
   pub fn validateJsonArray(
       json_bytes: []const u8,
       schema: Schema,
       allocator: Allocator,
   ) ![]ValidationResult
   ```

2. **Expose via C API**:
   ```zig
   export fn satya_validate_json_array(
       json_ptr: [*]const u8,
       json_len: usize,
       schema_ptr: [*]const SchemaField,
       schema_len: usize,
   ) [*]ValidationResult
   ```

3. **Python wrapper**:
   ```python
   class Schema:
       def validate_json_array(self, json_bytes: bytes) -> List[ValidationResult]:
           # Single FFI call: parse + validate
           pass
   ```

4. **Expected Performance**:
   - Compete directly with satya
   - Target: 8-12M users/sec
   - Benefit: JSON parsing in Zig (faster than Python's json.loads)

## 🎯 Priority 3: Improve Benchmark Fairness

### Current Issue

Comparing different operations:
- dhi: Individual field validation (30K FFI calls)
- satya: Batch JSON validation (1 FFI call)

### Proposed Solutions

#### Option A: Add Equivalent Benchmarks

```python
# benchmark_fair.py

# Scenario 1: Individual field validation
print("Individual Field Validation:")
print(f"  dhi:   {bench_dhi_individual()} calls/sec")
print(f"  satya: {bench_satya_individual()} calls/sec")  # If supported

# Scenario 2: Batch validation
print("Batch Validation:")
print(f"  dhi:   {bench_dhi_batch()} users/sec")  # New API
print(f"  satya: {bench_satya_batch()} users/sec")

# Scenario 3: JSON validation
print("JSON Array Validation:")
print(f"  dhi:   {bench_dhi_json()} users/sec")  # New API
print(f"  satya: {bench_satya_json()} users/sec")
```

#### Option B: Document Use Cases

Update README to show when to use each library:

```markdown
## When to Use dhi

✅ REST API validation (single objects)
✅ Form validation (individual fields)
✅ Real-time validation (low latency required)
✅ Flexible field-by-field validation

## When to Use satya

✅ Bulk data import (CSV, JSON files)
✅ Data pipelines (streaming)
✅ Batch processing (thousands of records)
✅ Pydantic compatibility needed
```

## 🎯 Priority 4: Optimize Python Wrapper

### Current Performance

- Direct C: 22.8M calls/sec
- Python wrapper: 14.6M calls/sec
- **Overhead**: 8.2M calls/sec (36% loss)

### Optimization Ideas

1. **Cache validator instances**:
   ```python
   class BoundedInt:
       _cache = {}
       
       def __new__(cls, min_val, max_val):
           key = (min_val, max_val)
           if key not in cls._cache:
               cls._cache[key] = super().__new__(cls)
           return cls._cache[key]
   ```

2. **Use __slots__** to reduce memory:
   ```python
   class BoundedInt:
       __slots__ = ('min_val', 'max_val', '_validator')
   ```

3. **Inline fast path**:
   ```python
   def validate(self, value):
       # Fast path: skip C call for obvious cases
       if not isinstance(value, int):
           raise ValidationError("Not an integer")
       # Then call C for range check
       return _dhi_native.validate_int(value, self.min_val, self.max_val)
   ```

4. **Expected improvement**: 14.6M → 16-18M calls/sec

## 🎯 Priority 5: Add More Validators

### Current Validators

- BoundedInt
- BoundedString
- Email (basic)

### Proposed Additions

1. **URL validation**:
   ```python
   from dhi import URL
   url = URL.validate("https://example.com")
   ```

2. **UUID validation**:
   ```python
   from dhi import UUID
   id = UUID.validate("550e8400-e29b-41d4-a716-446655440000")
   ```

3. **Phone number**:
   ```python
   from dhi import PhoneNumber
   phone = PhoneNumber.validate("+1-555-123-4567")
   ```

4. **Credit card**:
   ```python
   from dhi import CreditCard
   card = CreditCard.validate("4111111111111111")
   ```

5. **IP address**:
   ```python
   from dhi import IPAddress
   ip = IPAddress.validate("192.168.1.1")
   ```

## 🎯 Priority 6: Improve Documentation

### Add Use Case Examples

```markdown
## Use Cases

### REST API Validation
\`\`\`python
from flask import Flask, request
from dhi import BoundedInt, Email, ValidationError

@app.route('/users', methods=['POST'])
def create_user():
    try:
        age = BoundedInt(18, 120).validate(request.json['age'])
        email = Email.validate(request.json['email'])
        return {"success": True}
    except ValidationError as e:
        return {"error": str(e)}, 400
\`\`\`

### Bulk Data Import
\`\`\`python
from dhi import validate_batch

# Validate 100K records efficiently
results = validate_batch(records, schema)
valid = [r for r in results if r.is_valid()]
\`\`\`
```

### Add Performance Guide

```markdown
## Performance Tips

1. **Reuse validators**: Don't create new instances in loops
2. **Use batch APIs**: When validating multiple items
3. **Profile your code**: Identify bottlenecks
4. **Consider caching**: For expensive validations
```

## 🎯 Priority 7: Add Type Hints

Improve Python type hints for better IDE support:

```python
from typing import TypeVar, Generic, Union

T = TypeVar('T')

class BoundedInt:
    def validate(self, value: int) -> int: ...
    
class BoundedString:
    def validate(self, value: str) -> str: ...

class ValidationResult(Generic[T]):
    def is_valid(self) -> bool: ...
    def value(self) -> T: ...
    def errors(self) -> List[str]: ...
```

## Implementation Timeline

### Phase 1 (Week 1-2): Core Improvements
- ✅ Add batch validation API
- ✅ Update benchmarks
- ✅ Document use cases

### Phase 2 (Week 3-4): JSON Integration
- ✅ Add JSON parsing in Zig
- ✅ Expose via C API
- ✅ Python wrapper
- ✅ Benchmark against satya

### Phase 3 (Week 5-6): Optimization
- ✅ Optimize Python wrapper
- ✅ Add validator caching
- ✅ Profile and tune

### Phase 4 (Week 7-8): Polish
- ✅ Add more validators
- ✅ Improve documentation
- ✅ Add type hints
- ✅ Write tutorials

## Expected Results

After implementing these recommendations:

### Performance
- Individual validation: 14.6M calls/sec (current) → 16-18M calls/sec
- Batch validation: 4.32M users/sec → 10-15M users/sec
- JSON validation: Not available → 8-12M users/sec

### Competitiveness
- **Low-latency**: dhi wins (68.5ns vs satya's unknown)
- **Batch processing**: Competitive (10-15M vs satya's 10.7M)
- **JSON validation**: Competitive (8-12M vs satya's 10.7M)

### User Experience
- ✅ More validators available
- ✅ Better documentation
- ✅ Clearer use cases
- ✅ Fair benchmarks
- ✅ Type hints for IDE support

## Conclusion

dhi is already excellent for low-latency individual validations. With these improvements, it will also be competitive for batch processing while maintaining its performance advantage for single-field validation.

The key is to:
1. **Add batch APIs** to reduce FFI overhead
2. **Integrate JSON parsing** to compete directly with satya
3. **Document use cases** so users choose the right tool
4. **Optimize the Python wrapper** to reduce overhead
5. **Expand validator library** for more use cases

This will make dhi a complete, high-performance validation library suitable for all use cases.
