# Benchmark Analysis: dhi vs satya

## Latest Results (M3 Ultra, Correct Environment)

```
Direct C Extension:    22.8M calls/sec (43.9ns per call)
Python Wrapper:        14.6M calls/sec (68.5ns per call)
Real-world (dhi):      4.32M users/sec
Real-world (satya):    9.18M users/sec (avg), 10.7M peak
```

## The Critical Issue: Apples vs Oranges

### What We're Actually Comparing

#### dhi Benchmark
```python
for user in data:  # 10,000 iterations
    Name.validate(user["name"])      # Python → C → Zig
    Email.validate(user["email"])    # Python → C → Zig
    Age.validate(user["age"])        # Python → C → Zig
```
- **FFI crossings**: 30,000 (3 per user × 10,000 users)
- **Work per call**: Single field validation
- **Overhead**: Python call overhead × 30,000

#### satya Benchmark
```python
json_bytes = json.dumps(data).encode()  # Once
results = SatyaUser.model_validate_json_array_bytes(json_bytes)  # Once
```
- **FFI crossings**: 1 (single call)
- **Work per call**: Parse JSON + validate 10,000 users
- **Overhead**: Python call overhead × 1

### Why satya Appears Faster

1. **Batch processing advantage**: 1 FFI call vs 30,000
2. **JSON parsing included**: satya does JSON parsing + validation in Rust
3. **Warmup effect**: First run 4.06M/s, subsequent runs 10.7M/s (2.6x faster!)
4. **Amortized overhead**: Single Python→Rust crossing for all data

## Fair Comparison Scenarios

### Scenario 1: Individual Field Validation

**Use case**: Validating form inputs, API parameters, individual fields

```python
# Both libraries validate one field at a time
dhi:   Name.validate("Alice")     # 14.6M calls/sec
satya: [equivalent single field]  # Unknown - satya optimized for batch
```

**Winner**: dhi (designed for this use case)

### Scenario 2: Batch JSON Validation

**Use case**: Processing JSON arrays, bulk data import, streaming

```python
# Both libraries process entire JSON array
dhi:   [needs implementation]     # Not yet implemented
satya: model_validate_json_array_bytes(json)  # 10.7M users/sec
```

**Winner**: satya (designed for this use case)

### Scenario 3: Hybrid - Individual Objects

**Use case**: REST API endpoints, single record validation

```python
# Validate one user object
dhi:   3 field validations       # 4.32M users/sec (3 calls each)
satya: 1 model validation        # Unknown - needs single-object benchmark
```

**Winner**: Depends on implementation

## The Real Performance Story

### dhi Strengths

1. **Ultra-low latency per call**: 43.9ns direct, 68.5ns through Python
2. **Consistent performance**: 4.2-4.5M users/sec (no warmup needed)
3. **Flexible validation**: Mix and match validators
4. **Minimal overhead**: Direct C extension

### satya Strengths

1. **Batch processing**: 10.7M users/sec for arrays
2. **Integrated JSON parsing**: Parse + validate in one step
3. **Warmup optimization**: 2.6x faster after first run
4. **Rust ecosystem**: Full Pydantic-like features

## What the Numbers Really Mean

### dhi: 4.32M users/sec
- 3 validations per user = **12.96M validations/sec**
- Includes 30,000 Python→C FFI crossings
- **Per-validation cost**: 77ns (including FFI)

### satya: 10.7M users/sec (peak)
- 3 validations per user = **32.1M validations/sec**
- Includes 1 Python→Rust FFI crossing + JSON parsing
- **Per-validation cost**: 31ns (amortized)

### The FFI Tax

If we remove FFI overhead from dhi:
- Direct C calls: 22.8M/sec
- Through Python: 14.6M/sec
- **FFI overhead**: ~8.2M calls/sec lost

For 3 validations per user:
- Theoretical max: 14.6M ÷ 3 = **4.87M users/sec**
- Actual: 4.32M users/sec
- **Efficiency**: 89% (very good!)

## Recommendations

### For dhi Users

**When to use dhi:**
1. ✅ Individual field validation (forms, API params)
2. ✅ Low-latency requirements (43.9ns per call)
3. ✅ Flexible validation logic
4. ✅ Minimal dependencies

**How to optimize:**
1. Batch validations when possible
2. Reuse validator instances
3. Consider adding batch API (like satya)

### For satya Users

**When to use satya:**
1. ✅ Batch JSON processing
2. ✅ Bulk data import/export
3. ✅ Streaming validation
4. ✅ Full Pydantic compatibility

**How to optimize:**
1. Always use batch APIs
2. Let warmup happen (first run slower)
3. Process larger batches for better amortization

## Proposed: Fair Benchmark

To compare fairly, we need **equivalent operations**:

### Option 1: Both Individual
```python
# dhi
Age.validate(25)  # 14.6M/sec

# satya (if supported)
AgeValidator.validate(25)  # ???
```

### Option 2: Both Batch
```python
# dhi (needs implementation)
validate_users_batch(users)  # ???

# satya
model_validate_json_array_bytes(json)  # 10.7M/sec
```

### Option 3: Same Workload
```python
# Both validate 10,000 users with 3 fields each
# Measure total time including all overhead
# Report as users/sec
```

## Conclusion

### Current Comparison is Misleading

- **dhi**: 4.32M users/sec with 30,000 FFI calls
- **satya**: 10.7M users/sec with 1 FFI call

This is like comparing:
- A sports car making 30,000 trips (dhi)
- A bus making 1 trip with all passengers (satya)

### Both Libraries Excel at Different Things

| Use Case | Best Choice | Why |
|----------|-------------|-----|
| Single field validation | **dhi** | 43.9ns latency, no warmup |
| Batch JSON processing | **satya** | 10.7M users/sec, integrated parsing |
| REST API (single object) | **dhi** | Lower overhead per request |
| Bulk data import | **satya** | Better batch performance |
| Form validation | **dhi** | Field-by-field flexibility |
| Data pipeline | **satya** | Streaming support |

### The Real Winner

**Both libraries are excellent!** They're optimized for different use cases:

- **dhi**: Optimized for **low-latency individual validations**
- **satya**: Optimized for **high-throughput batch processing**

Choose based on your use case, not just the benchmark numbers.

## Next Steps

### For dhi

1. **Add batch validation API**:
   ```python
   # Proposed API
   results = validate_users_batch(users, Name, Email, Age)
   # Single FFI call, validate all users
   ```

2. **Add JSON integration**:
   ```python
   # Proposed API
   results = User.validate_json_array(json_bytes)
   # Compete directly with satya
   ```

3. **Benchmark fairly**:
   - Compare batch-to-batch
   - Or compare individual-to-individual
   - Document the differences

### For Documentation

1. **Clarify use cases** in README
2. **Show both scenarios** (individual vs batch)
3. **Explain trade-offs** honestly
4. **Provide guidance** on when to use each

## Final Thoughts

The benchmark shows:
- ✅ dhi's C extension is **extremely fast** (22.8M calls/sec)
- ✅ dhi's Python wrapper is **efficient** (89% of theoretical max)
- ✅ satya's batch processing is **excellent** (10.7M users/sec)
- ⚠️ The comparison is **not apples-to-apples**

Both libraries are high-quality. The choice depends on your use case:
- Need low latency? → **dhi**
- Need high throughput? → **satya**
- Need both? → Use both! (They can coexist)
