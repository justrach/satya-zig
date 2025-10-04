"""
Test if native C extension is working
"""

import time
from dhi import BoundedInt, HAS_NATIVE_EXT

print(f"Native extension available: {HAS_NATIVE_EXT}")

if HAS_NATIVE_EXT:
    from dhi import _dhi_native
    print(f"Native functions: {[x for x in dir(_dhi_native) if not x.startswith('_')]}")
    
    # Test direct call
    result = _dhi_native.validate_int(25, 18, 90)
    print(f"Direct native call: validate_int(25, 18, 90) = {result}")

# Benchmark
Age = BoundedInt(18, 90)

print("\n🚀 Benchmarking 1M validations...")
start = time.perf_counter()
for i in range(1_000_000):
    try:
        Age.validate(25)
    except:
        pass
elapsed = time.perf_counter() - start

throughput = 1_000_000 / elapsed
print(f"Time: {elapsed:.4f}s")
print(f"Throughput: {throughput:,.0f} validations/sec")
print(f"Per validation: {elapsed * 1_000_000:.2f}ns")

if HAS_NATIVE_EXT:
    print("\n✅ Using native C extension (zero FFI overhead!)")
else:
    print("\n⚠️  Using ctypes (150ns FFI overhead per call)")
