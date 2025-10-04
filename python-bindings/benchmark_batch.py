"""
Benchmark: Batch validation vs Individual validation

This benchmark demonstrates the performance improvement from batch validation
by reducing FFI overhead.
"""

import time
from typing import List
import json

try:
    from dhi import (
        BoundedInt, BoundedString, Email,
        validate_users_batch,
        validate_ints_batch,
        validate_strings_batch,
        validate_emails_batch,
    )
except ImportError as e:
    print(f"Error importing dhi: {e}")
    exit(1)

try:
    from satya import Model, Field
    HAS_SATYA = True
except ImportError:
    HAS_SATYA = False


def generate_test_data(n: int) -> List[dict]:
    """Generate test user data"""
    return [
        {
            "id": i,
            "name": f"User{i}",
            "email": f"user{i}@example.com",
            "age": 20 + (i % 50),
            "active": i % 2 == 0,
        }
        for i in range(n)
    ]


print("=" * 80)
print("🚀 BATCH VALIDATION BENCHMARK")
print("=" * 80)
print()

# ============================================================================
# Test 1: Individual vs Batch Integer Validation
# ============================================================================

print("=" * 80)
print("Test 1: Integer Validation (10,000 values)")
print("=" * 80)

values = [20 + (i % 50) for i in range(10000)]
Age = BoundedInt(18, 90)

# Individual validation
start = time.perf_counter()
individual_results = []
for v in values:
    try:
        Age.validate(v)
        individual_results.append(True)
    except:
        individual_results.append(False)
elapsed_individual = time.perf_counter() - start
throughput_individual = len(values) / elapsed_individual

print(f"Individual validation:")
print(f"  Time: {elapsed_individual:.4f}s")
print(f"  Throughput: {throughput_individual:,.0f} values/sec")
print(f"  FFI calls: {len(values):,}")
print()

# Batch validation
start = time.perf_counter()
batch_result = validate_ints_batch(values, 18, 90)
elapsed_batch = time.perf_counter() - start
throughput_batch = len(values) / elapsed_batch

print(f"Batch validation:")
print(f"  Time: {elapsed_batch:.4f}s")
print(f"  Throughput: {throughput_batch:,.0f} values/sec")
print(f"  FFI calls: 1")
print()

speedup = throughput_batch / throughput_individual
print(f"🎉 Batch is {speedup:.2f}x FASTER ({speedup - 1:.0%} improvement)")
print(f"   FFI overhead reduced by {(1 - elapsed_batch/elapsed_individual) * 100:.1f}%")
print()

# ============================================================================
# Test 2: Individual vs Batch User Validation
# ============================================================================

print("=" * 80)
print("Test 2: User Validation (10,000 users, 3 fields each)")
print("=" * 80)

data = generate_test_data(10000)

# Individual validation (current approach)
Name = BoundedString(1, 100)
Age = BoundedInt(18, 120)

start = time.perf_counter()
valid_count_individual = 0
for user in data:
    try:
        Name.validate(user["name"])
        Email.validate(user["email"])
        Age.validate(user["age"])
        valid_count_individual += 1
    except:
        pass
elapsed_individual = time.perf_counter() - start
throughput_individual = len(data) / elapsed_individual

print(f"Individual validation:")
print(f"  Time: {elapsed_individual:.4f}s")
print(f"  Throughput: {throughput_individual:,.0f} users/sec")
print(f"  FFI calls: {len(data) * 3:,} (3 per user)")
print(f"  Valid: {valid_count_individual}/{len(data)}")
print()

# Batch validation (new approach)
start = time.perf_counter()
batch_result = validate_users_batch(data, name_min=1, name_max=100, age_min=18, age_max=120)
elapsed_batch = time.perf_counter() - start
throughput_batch = len(data) / elapsed_batch

print(f"Batch validation:")
print(f"  Time: {elapsed_batch:.4f}s")
print(f"  Throughput: {throughput_batch:,.0f} users/sec")
print(f"  FFI calls: 1 (single call for all users)")
print(f"  Valid: {batch_result.valid_count}/{batch_result.total_count}")
print()

speedup = throughput_batch / throughput_individual
print(f"🎉 Batch is {speedup:.2f}x FASTER ({speedup - 1:.0%} improvement)")
print(f"   FFI overhead reduced by {(1 - elapsed_batch/elapsed_individual) * 100:.1f}%")
print()

# ============================================================================
# Test 3: Comparison with satya
# ============================================================================

if HAS_SATYA:
    print("=" * 80)
    print("Test 3: dhi Batch vs satya Batch (10,000 users)")
    print("=" * 80)
    
    # dhi batch (already measured above)
    print(f"dhi (batch validation):")
    print(f"  Time: {elapsed_batch:.4f}s")
    print(f"  Throughput: {throughput_batch:,.0f} users/sec")
    print(f"  Valid: {batch_result.valid_count}/{batch_result.total_count}")
    print()
    
    # satya batch
    class SatyaUser(Model):
        id: int
        name: str = Field(min_length=1, max_length=100)
        email: str = Field(email=True)
        age: int = Field(ge=18, le=120)
        active: bool
    
    json_bytes = json.dumps(data).encode()
    
    # Warmup
    try:
        _ = SatyaUser.model_validate_json_array_bytes(json_bytes)
    except:
        pass
    
    start = time.perf_counter()
    results = SatyaUser.model_validate_json_array_bytes(json_bytes)
    elapsed_satya = time.perf_counter() - start
    throughput_satya = len(data) / elapsed_satya
    
    print(f"satya (Rust + PyO3):")
    print(f"  Time: {elapsed_satya:.4f}s")
    print(f"  Throughput: {throughput_satya:,.0f} users/sec")
    print()
    
    speedup = throughput_batch / throughput_satya
    if speedup > 1:
        print(f"🎉 dhi is {speedup:.2f}x FASTER than satya!")
    else:
        print(f"satya is {1/speedup:.2f}x faster than dhi")
    print()

# ============================================================================
# Summary
# ============================================================================

print("=" * 80)
print("📊 SUMMARY")
print("=" * 80)
print()
print("Batch validation dramatically reduces FFI overhead:")
print()
print("Integer validation:")
print(f"  Individual: {throughput_individual:,.0f} values/sec (10,000 FFI calls)")
print(f"  Batch:      {throughput_batch:,.0f} values/sec (1 FFI call)")
print(f"  Speedup:    {throughput_batch/throughput_individual:.2f}x")
print()
print("User validation:")
print(f"  Individual: {len(data) / elapsed_individual:,.0f} users/sec (30,000 FFI calls)")
print(f"  Batch:      {throughput_batch:,.0f} users/sec (1 FFI call)")
print(f"  Speedup:    {throughput_batch / (len(data) / elapsed_individual):.2f}x")
print()

if HAS_SATYA:
    print("Comparison with satya:")
    print(f"  dhi (batch):  {throughput_batch:,.0f} users/sec")
    print(f"  satya (batch): {throughput_satya:,.0f} users/sec")
    if throughput_batch > throughput_satya:
        print(f"  Winner: dhi ({throughput_batch/throughput_satya:.2f}x faster)")
    else:
        print(f"  Winner: satya ({throughput_satya/throughput_batch:.2f}x faster)")
    print()

print("✅ Batch validation is the key to high-throughput validation!")
print("=" * 80)
