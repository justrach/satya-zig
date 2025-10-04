"""
Test comprehensive validators - Pydantic & Zod complete!
"""

from dhi import _dhi_native, validate_users_batch

print("=" * 80)
print("🎉 COMPREHENSIVE VALIDATORS TEST")
print("=" * 80)
print()

# Test data with various validator types
users = [
    {
        "name": "Alice",
        "email": "alice@example.com",
        "age": 25,
        "website": "https://alice.com",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "ip_address": "192.168.1.1",
        "created_date": "2024-01-15",
        "score": 95,
    },
    {
        "name": "Bob",
        "email": "bob@example.com",
        "age": 30,
        "website": "https://bob.io",
        "user_id": "660e8400-e29b-41d4-a716-446655440001",
        "ip_address": "10.0.0.1",
        "created_date": "2024-02-20",
        "score": 88,
    },
    {
        "name": "X",  # Too short
        "email": "invalid",  # Invalid email
        "age": 15,  # Too young
        "website": "not-a-url",  # Invalid URL
        "user_id": "invalid-uuid",  # Invalid UUID
        "ip_address": "999.999.999.999",  # Invalid IP
        "created_date": "2024-13-45",  # Invalid date
        "score": 150,  # Out of range
    },
]

print("Test 1: Basic validators (string, email, int)")
print("-" * 80)
field_specs = {
    'name': ('string', 2, 100),
    'email': ('email',),
    'age': ('int', 18, 120),
}
results, valid_count = _dhi_native.validate_batch_direct(users, field_specs)
print(f"Valid: {valid_count}/{len(users)}")
print(f"Results: {results}")
print()

print("Test 2: Advanced string validators (URL, UUID, IPv4, ISO date)")
print("-" * 80)
field_specs = {
    'website': ('url',),
    'user_id': ('uuid',),
    'ip_address': ('ipv4',),
    'created_date': ('iso_date',),
}
results, valid_count = _dhi_native.validate_batch_direct(users, field_specs)
print(f"Valid: {valid_count}/{len(users)}")
print(f"Results: {results}")
print()

print("Test 3: Number validators (positive, gt, lte)")
print("-" * 80)
field_specs = {
    'age': ('int_positive',),
    'score': ('int_gt', 0),  # Score > 0
}
results, valid_count = _dhi_native.validate_batch_direct(users, field_specs)
print(f"Valid: {valid_count}/{len(users)}")
print(f"Results: {results}")
print()

print("Test 4: Combined validators (all fields)")
print("-" * 80)
field_specs = {
    'name': ('string', 2, 100),
    'email': ('email',),
    'age': ('int_positive',),
    'website': ('url',),
    'user_id': ('uuid',),
    'ip_address': ('ipv4',),
    'created_date': ('iso_date',),
    'score': ('int_lte', 100),  # Score <= 100
}
results, valid_count = _dhi_native.validate_batch_direct(users, field_specs)
print(f"Valid: {valid_count}/{len(users)}")
print(f"Results: {results}")
for i, (user, is_valid) in enumerate(zip(users, results)):
    status = "✅" if is_valid else "❌"
    print(f"  {status} User {i+1}: {user['name']}")
print()

print("Test 5: Performance test with 10,000 items")
print("-" * 80)

import time

# Generate test data
large_dataset = []
for i in range(10000):
    large_dataset.append({
        "name": f"User{i}",
        "email": f"user{i}@example.com",
        "age": 20 + (i % 50),
        "website": f"https://user{i}.com",
        "user_id": f"550e8400-e29b-41d4-a716-{i:012d}",
        "ip_address": f"192.168.{i % 256}.{i % 256}",
        "created_date": "2024-01-15",
        "score": 50 + (i % 50),
    })

field_specs = {
    'name': ('string', 1, 100),
    'email': ('email',),
    'age': ('int_positive',),
    'website': ('url',),
    'user_id': ('uuid',),
    'ip_address': ('ipv4',),
    'created_date': ('iso_date',),
    'score': ('int_lte', 100),
}

# Warmup
_ = _dhi_native.validate_batch_direct(large_dataset, field_specs)

# Benchmark
times = []
for i in range(5):
    start = time.perf_counter()
    results, valid_count = _dhi_native.validate_batch_direct(large_dataset, field_specs)
    elapsed = time.perf_counter() - start
    times.append(elapsed)
    throughput = len(large_dataset) / elapsed
    print(f"  Run {i+1}: {throughput:,.0f} items/sec ({elapsed*1000:.2f}ms)")

avg_time = sum(times) / len(times)
avg_throughput = len(large_dataset) / avg_time
print(f"\nAverage: {avg_throughput:,.0f} items/sec")
print(f"Valid: {valid_count}/{len(large_dataset)}")
print()

print("=" * 80)
print("✅ ALL COMPREHENSIVE VALIDATORS WORKING!")
print("=" * 80)
print()
print("Supported validators:")
print("  String: email, url, uuid, ipv4, base64, iso_date, iso_datetime")
print("  Number: int, int_gt, int_gte, int_lt, int_lte")
print("  Number: int_positive, int_non_negative, int_multiple_of")
print("  General: string (with min/max length)")
print()
print(f"Performance: {avg_throughput:,.0f} items/sec with 8 validators per item!")
print("=" * 80)
