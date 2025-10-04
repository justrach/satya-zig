"""
Simple test to verify batch validation is working
"""

import time
from dhi import validate_users_batch, _dhi_native

# Check if batch function exists
print("Checking for batch validation functions...")
print(f"Has _dhi_native: {_dhi_native is not None}")
if _dhi_native:
    print(f"Has validate_users_batch_optimized: {hasattr(_dhi_native, 'validate_users_batch_optimized')}")
    print(f"Available functions: {[x for x in dir(_dhi_native) if not x.startswith('_')]}")

print()

# Test data
users = [
    {"name": "Alice", "email": "alice@example.com", "age": 25},
    {"name": "Bob", "email": "bob@example.com", "age": 30},
    {"name": "", "email": "invalid", "age": 15},  # Invalid
]

print("Testing batch validation...")
result = validate_users_batch(users)
print(f"Result: {result}")
print(f"Valid: {result.valid_count}/{result.total_count}")
print(f"Results: {result.results}")
print()

# Benchmark with larger dataset
print("Benchmarking with 10,000 users...")
large_users = [
    {"name": f"User{i}", "email": f"user{i}@example.com", "age": 20 + (i % 50)}
    for i in range(10000)
]

# Warmup
_ = validate_users_batch(large_users)

# Multiple runs
times = []
for i in range(5):
    start = time.perf_counter()
    result = validate_users_batch(large_users)
    elapsed = time.perf_counter() - start
    times.append(elapsed)
    throughput = len(large_users) / elapsed
    print(f"  Run {i+1}: {throughput:,.0f} users/sec ({elapsed:.4f}s)")

avg_time = sum(times) / len(times)
avg_throughput = len(large_users) / avg_time
print(f"\nAverage: {avg_throughput:,.0f} users/sec")
print(f"Valid: {result.valid_count}/{result.total_count}")
