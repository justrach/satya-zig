"""
Benchmark dhi vs msgspec vs satya for JSON validation
"""

import json
import time
from typing import List
import sys

# Try to import all libraries
try:
    from dhi import BoundedInt, BoundedString, Email, ValidationError
    HAS_DHI = True
except ImportError:
    HAS_DHI = False
    print("⚠️  dhi not installed")

try:
    import msgspec
    HAS_MSGSPEC = True
except ImportError:
    HAS_MSGSPEC = False
    print("⚠️  msgspec not installed (pip install msgspec)")

try:
    from satya import Model, Field
    HAS_SATYA = True
except ImportError:
    HAS_SATYA = False
    print("⚠️  satya not installed (pip install satya)")


# Test data
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


# ============================================================================
# dhi Implementation (Pure Python)
# ============================================================================

class DhiUser:
    """dhi validator"""
    def __init__(self):
        self.name_validator = BoundedString(1, 100)
        self.email_validator = Email()
        self.age_validator = BoundedInt(18, 120)
    
    def validate(self, data: dict):
        """Validate user data"""
        return {
            "id": data["id"],
            "name": self.name_validator.validate(data["name"]),
            "email": self.email_validator.validate(data["email"]),
            "age": self.age_validator.validate(data["age"]),
            "active": data["active"],
        }


def bench_dhi(data: List[dict], iterations: int = 1):
    """Benchmark dhi"""
    validator = DhiUser()
    
    start = time.perf_counter()
    for _ in range(iterations):
        results = []
        for item in data:
            try:
                results.append(validator.validate(item))
            except ValidationError:
                pass
    elapsed = time.perf_counter() - start
    
    return elapsed, len(results)


# ============================================================================
# msgspec Implementation
# ============================================================================

if HAS_MSGSPEC:
    class MsgspecUser(msgspec.Struct):
        """msgspec struct"""
        id: int
        name: str
        email: str
        age: int
        active: bool


def bench_msgspec(data: List[dict], iterations: int = 1):
    """Benchmark msgspec"""
    # Convert to JSON bytes
    json_data = [json.dumps(item).encode() for item in data]
    
    start = time.perf_counter()
    for _ in range(iterations):
        results = []
        for item_bytes in json_data:
            try:
                results.append(msgspec.json.decode(item_bytes, type=MsgspecUser))
            except msgspec.ValidationError:
                pass
    elapsed = time.perf_counter() - start
    
    return elapsed, len(results)


# ============================================================================
# satya Implementation (Rust-backed)
# ============================================================================

if HAS_SATYA:
    class SatyaUser(Model):
        """satya model"""
        id: int
        name: str = Field(min_length=1, max_length=100)
        email: str = Field(email=True)
        age: int = Field(ge=18, le=120)
        active: bool


def bench_satya(data: List[dict], iterations: int = 1):
    """Benchmark satya"""
    # Convert to JSON bytes
    json_bytes = json.dumps(data).encode()
    
    start = time.perf_counter()
    valid_count = 0
    for _ in range(iterations):
        results = SatyaUser.model_validate_json_array_bytes(json_bytes)
        # satya returns list of results, check if they're valid
        if isinstance(results, list):
            valid_count = len([r for r in results if hasattr(r, 'is_valid') and r.is_valid])
        else:
            valid_count = len(data)
    elapsed = time.perf_counter() - start
    
    return elapsed, valid_count


# ============================================================================
# Benchmark Runner
# ============================================================================

def run_benchmarks():
    """Run all benchmarks"""
    print("=" * 70)
    print("🚀 JSON Validation Benchmark: dhi vs msgspec vs satya")
    print("=" * 70)
    print()
    
    sizes = [100, 1000, 10000]
    
    for size in sizes:
        print(f"\n📊 Dataset size: {size:,} items")
        print("-" * 70)
        
        data = generate_test_data(size)
        iterations = max(1, 10000 // size)  # More iterations for smaller datasets
        
        results = {}
        
        # Benchmark dhi
        if HAS_DHI:
            elapsed, count = bench_dhi(data, iterations)
            throughput = (size * iterations) / elapsed
            results['dhi'] = {
                'time': elapsed,
                'throughput': throughput,
                'valid': count,
            }
            print(f"dhi (Pure Python):  {elapsed:.4f}s | {throughput:,.0f} items/sec")
        
        # Benchmark msgspec
        if HAS_MSGSPEC:
            elapsed, count = bench_msgspec(data, iterations)
            throughput = (size * iterations) / elapsed
            results['msgspec'] = {
                'time': elapsed,
                'throughput': throughput,
                'valid': count,
            }
            print(f"msgspec:            {elapsed:.4f}s | {throughput:,.0f} items/sec")
        
        # Benchmark satya
        if HAS_SATYA:
            elapsed, count = bench_satya(data, iterations)
            throughput = (size * iterations) / elapsed
            results['satya'] = {
                'time': elapsed,
                'throughput': throughput,
                'valid': count,
            }
            print(f"satya (Rust):       {elapsed:.4f}s | {throughput:,.0f} items/sec")
        
        # Show speedup comparisons
        if HAS_DHI and HAS_MSGSPEC:
            speedup = results['msgspec']['throughput'] / results['dhi']['throughput']
            print(f"\n  msgspec is {speedup:.1f}x faster than dhi")
        
        if HAS_DHI and HAS_SATYA:
            speedup = results['satya']['throughput'] / results['dhi']['throughput']
            print(f"  satya is {speedup:.1f}x faster than dhi")
        
        if HAS_MSGSPEC and HAS_SATYA:
            speedup = results['satya']['throughput'] / results['msgspec']['throughput']
            print(f"  satya is {speedup:.1f}x faster than msgspec")
    
    print("\n" + "=" * 70)
    print("📝 Notes:")
    print("  - dhi: Pure Python (current implementation)")
    print("  - msgspec: C extension for JSON parsing")
    print("  - satya: Rust-backed with optimized JSON parsing")
    print("  - Future: dhi will use Zig native backend for 100x+ speedup!")
    print("=" * 70)


def main():
    """Main entry point"""
    if not any([HAS_DHI, HAS_MSGSPEC, HAS_SATYA]):
        print("❌ No libraries available for benchmarking!")
        print("\nInstall with:")
        print("  pip install dhi msgspec satya")
        sys.exit(1)
    
    run_benchmarks()


if __name__ == "__main__":
    main()
