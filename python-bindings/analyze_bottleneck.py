"""
Analyze where the bottleneck is in batch validation
"""

import time
from dhi import _dhi_native

# Test data
users = [
    {"name": f"User{i}", "email": f"user{i}@example.com", "age": 20 + (i % 50)}
    for i in range(10000)
]

print("Analyzing batch validation bottlenecks...")
print()

# Step 1: Extract fields (Python overhead)
start = time.perf_counter()
names = [user.get('name', '').encode('utf-8') for user in users]
emails = [user.get('email', '').encode('utf-8') for user in users]
ages = [user.get('age', 0) for user in users]
extract_time = time.perf_counter() - start
print(f"1. Extract & encode fields: {extract_time:.4f}s ({extract_time * 1000:.2f}ms)")

# Step 2: Call native function (FFI + Zig validation)
start = time.perf_counter()
results, valid_count = _dhi_native.validate_users_batch_optimized(
    names, emails, ages, 1, 100, 18, 120
)
native_time = time.perf_counter() - start
print(f"2. Native validation:       {native_time:.4f}s ({native_time * 1000:.2f}ms)")

# Step 3: Total time
total_time = extract_time + native_time
throughput = len(users) / total_time
print(f"3. Total time:              {total_time:.4f}s ({total_time * 1000:.2f}ms)")
print()
print(f"Throughput: {throughput:,.0f} users/sec")
print(f"Valid: {valid_count}/{len(users)}")
print()

# Breakdown
print("Bottleneck analysis:")
extract_pct = (extract_time / total_time) * 100
native_pct = (native_time / total_time) * 100
print(f"  Python overhead: {extract_pct:.1f}% ({extract_time * 1000:.2f}ms)")
print(f"  Native validation: {native_pct:.1f}% ({native_time * 1000:.2f}ms)")
print()

# What if we could eliminate Python overhead?
theoretical_throughput = len(users) / native_time
print(f"Theoretical max (no Python overhead): {theoretical_throughput:,.0f} users/sec")
print(f"Potential speedup: {theoretical_throughput / throughput:.2f}x")
print()

# Compare with individual validation overhead
print("For comparison:")
print(f"  Individual validation: 3 FFI calls per user = 30,000 FFI calls")
print(f"  Batch validation: 1 FFI call total")
print(f"  FFI reduction: {30000 / 1:.0f}x fewer calls")
