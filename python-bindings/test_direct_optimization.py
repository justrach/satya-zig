"""
Test the ultra-optimized direct dict extraction
"""

import time
from dhi import _dhi_native, validate_users_batch

# Test data
users = [
    {"name": f"User{i}", "email": f"user{i}@example.com", "age": 20 + (i % 50)}
    for i in range(10000)
]

print("=" * 80)
print("🚀 ULTRA-OPTIMIZED BATCH VALIDATION TEST")
print("=" * 80)
print()

# Check if direct function is available
if hasattr(_dhi_native, 'validate_users_batch_direct'):
    print("✅ validate_users_batch_direct is available!")
    print()
    
    # Test 1: Direct function (C extracts from dicts)
    print("Test 1: Direct dict extraction in C (ZERO Python overhead)")
    print("-" * 80)
    
    times = []
    for i in range(5):
        start = time.perf_counter()
        results, valid_count = _dhi_native.validate_users_batch_direct(
            users, 1, 100, 18, 120
        )
        elapsed = time.perf_counter() - start
        times.append(elapsed)
        throughput = len(users) / elapsed
        print(f"  Run {i+1}: {throughput:,.0f} users/sec ({elapsed*1000:.2f}ms)")
    
    avg_time = sum(times) / len(times)
    avg_throughput = len(users) / avg_time
    print(f"\n  Average: {avg_throughput:,.0f} users/sec")
    print(f"  Valid: {valid_count}/{len(users)}")
    print()
    
    # Test 2: High-level API (should use direct function automatically)
    print("Test 2: High-level API (validate_users_batch)")
    print("-" * 80)
    
    times2 = []
    for i in range(5):
        start = time.perf_counter()
        result = validate_users_batch(users)
        elapsed = time.perf_counter() - start
        times2.append(elapsed)
        throughput = len(users) / elapsed
        print(f"  Run {i+1}: {throughput:,.0f} users/sec ({elapsed*1000:.2f}ms)")
    
    avg_time2 = sum(times2) / len(times2)
    avg_throughput2 = len(users) / avg_time2
    print(f"\n  Average: {avg_throughput2:,.0f} users/sec")
    print(f"  Valid: {result.valid_count}/{result.total_count}")
    print()
    
    # Comparison
    print("=" * 80)
    print("📊 COMPARISON")
    print("=" * 80)
    print(f"Direct C function:  {avg_throughput:,.0f} users/sec")
    print(f"High-level API:     {avg_throughput2:,.0f} users/sec")
    print(f"Overhead:           {(avg_time2 - avg_time) * 1000:.2f}ms ({(avg_time2/avg_time - 1) * 100:.1f}%)")
    
else:
    print("❌ validate_users_batch_direct not found!")
    print("Available functions:", [x for x in dir(_dhi_native) if not x.startswith('_')])
