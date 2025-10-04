"""
Performance diagnostic tool to understand benchmark variations
"""

import time
import platform
import sys
import os
from typing import List
import json

try:
    from dhi import _dhi_native, HAS_NATIVE_EXT
    from dhi import BoundedInt, BoundedString, Email
except ImportError as e:
    print(f"Error importing dhi: {e}")
    exit(1)

try:
    from satya import Model, Field
    HAS_SATYA = True
except ImportError:
    HAS_SATYA = False


def print_system_info():
    """Print detailed system information"""
    print("=" * 80)
    print("🖥️  SYSTEM INFORMATION")
    print("=" * 80)
    print(f"Platform: {platform.platform()}")
    print(f"Processor: {platform.processor()}")
    print(f"Python: {sys.version}")
    print(f"CPU Count: {os.cpu_count()}")
    
    # Try to get more detailed CPU info on macOS
    try:
        import subprocess
        cpu_brand = subprocess.check_output(
            ["sysctl", "-n", "machdep.cpu.brand_string"],
            text=True
        ).strip()
        print(f"CPU Model: {cpu_brand}")
        
        cpu_freq = subprocess.check_output(
            ["sysctl", "-n", "hw.cpufrequency"],
            text=True
        ).strip()
        print(f"CPU Frequency: {int(cpu_freq) / 1e9:.2f} GHz")
    except:
        pass
    
    print()


def run_warmup_test():
    """Run extensive warmup to ensure CPU is at full speed"""
    print("=" * 80)
    print("🔥 WARMUP PHASE (CPU Frequency Scaling)")
    print("=" * 80)
    
    # Run for 2 seconds to let CPU ramp up
    Age = BoundedInt(18, 90)
    start = time.perf_counter()
    count = 0
    while time.perf_counter() - start < 2.0:
        Age.validate(25)
        count += 1
    
    elapsed = time.perf_counter() - start
    throughput = count / elapsed
    print(f"Warmup completed: {count:,} iterations in {elapsed:.2f}s")
    print(f"Warmup throughput: {throughput:,.0f} calls/sec")
    print()


def benchmark_direct_c_extension(iterations=10_000_000):
    """Benchmark direct C extension calls"""
    if not HAS_NATIVE_EXT:
        return None
    
    print("=" * 80)
    print("Test 1: Direct C Extension Calls")
    print("=" * 80)
    
    # Multiple runs to check consistency
    results = []
    for run in range(5):
        start = time.perf_counter()
        for _ in range(iterations):
            _dhi_native.validate_int(25, 18, 90)
        elapsed = time.perf_counter() - start
        throughput = iterations / elapsed
        results.append(throughput)
        print(f"  Run {run + 1}: {throughput:,.0f} calls/sec ({elapsed:.4f}s)")
    
    avg_throughput = sum(results) / len(results)
    min_throughput = min(results)
    max_throughput = max(results)
    
    print(f"\n  Average: {avg_throughput:,.0f} calls/sec")
    print(f"  Min: {min_throughput:,.0f} calls/sec")
    print(f"  Max: {max_throughput:,.0f} calls/sec")
    print(f"  Variance: {(max_throughput - min_throughput) / avg_throughput * 100:.1f}%")
    print()
    
    return avg_throughput


def benchmark_python_wrapper(iterations=1_000_000):
    """Benchmark through Python wrapper"""
    print("=" * 80)
    print("Test 2: Through Python Wrapper (BoundedInt)")
    print("=" * 80)
    
    Age = BoundedInt(18, 90)
    results = []
    
    for run in range(5):
        start = time.perf_counter()
        for _ in range(iterations):
            Age.validate(25)
        elapsed = time.perf_counter() - start
        throughput = iterations / elapsed
        results.append(throughput)
        print(f"  Run {run + 1}: {throughput:,.0f} calls/sec ({elapsed:.4f}s)")
    
    avg_throughput = sum(results) / len(results)
    min_throughput = min(results)
    max_throughput = max(results)
    
    print(f"\n  Average: {avg_throughput:,.0f} calls/sec")
    print(f"  Min: {min_throughput:,.0f} calls/sec")
    print(f"  Max: {max_throughput:,.0f} calls/sec")
    print(f"  Variance: {(max_throughput - min_throughput) / avg_throughput * 100:.1f}%")
    print()
    
    return avg_throughput


def benchmark_full_validation(num_users=10000):
    """Benchmark full user validation"""
    print("=" * 80)
    print("Test 3: Full User Validation")
    print("=" * 80)
    
    Name = BoundedString(1, 100)
    Age = BoundedInt(18, 90)
    
    data = [
        {
            "id": i,
            "name": f"User{i}",
            "email": f"user{i}@example.com",
            "age": 20 + (i % 50),
            "active": i % 2 == 0,
        }
        for i in range(num_users)
    ]
    
    # dhi benchmark
    dhi_results = []
    for run in range(5):
        start = time.perf_counter()
        valid_count = 0
        for user in data:
            try:
                Name.validate(user["name"])
                Email.validate(user["email"])
                Age.validate(user["age"])
                valid_count += 1
            except:
                pass
        elapsed = time.perf_counter() - start
        throughput = len(data) / elapsed
        dhi_results.append(throughput)
        print(f"  dhi Run {run + 1}: {throughput:,.0f} users/sec ({elapsed:.4f}s)")
    
    avg_dhi = sum(dhi_results) / len(dhi_results)
    print(f"\n  dhi Average: {avg_dhi:,.0f} users/sec")
    print(f"  dhi Min: {min(dhi_results):,.0f} users/sec")
    print(f"  dhi Max: {max(dhi_results):,.0f} users/sec")
    print()
    
    # satya benchmark
    if HAS_SATYA:
        try:
            class SatyaUser(Model):
                id: int
                name: str = Field(min_length=1, max_length=100)
                email: str = Field(email=True)
                age: int = Field(ge=18, le=120)
                active: bool
            
            json_bytes = json.dumps(data).encode()
            
            # Check if the method exists
            if not hasattr(SatyaUser, 'model_validate_json_array_bytes'):
                print("  ⚠️  satya version doesn't have model_validate_json_array_bytes")
                print("  Skipping satya comparison")
            else:
                satya_results = []
                
                for run in range(5):
                    start = time.perf_counter()
                    results = SatyaUser.model_validate_json_array_bytes(json_bytes)
                    elapsed = time.perf_counter() - start
                    throughput = len(data) / elapsed
                    satya_results.append(throughput)
                    print(f"  satya Run {run + 1}: {throughput:,.0f} users/sec ({elapsed:.4f}s)")
                
                avg_satya = sum(satya_results) / len(satya_results)
                print(f"\n  satya Average: {avg_satya:,.0f} users/sec")
                print(f"  satya Min: {min(satya_results):,.0f} users/sec")
                print(f"  satya Max: {max(satya_results):,.0f} users/sec")
                print()
                
                speedup = avg_dhi / avg_satya
                if speedup > 1:
                    print(f"🎉 dhi is {speedup:.2f}x FASTER than satya!")
                else:
                    print(f"⚠️  satya is {1/speedup:.2f}x faster than dhi")
        except Exception as e:
            print(f"  ⚠️  Error benchmarking satya: {e}")
            print("  Skipping satya comparison")
    
    print()
    return avg_dhi


def check_thermal_throttling():
    """Check if system might be thermal throttling"""
    print("=" * 80)
    print("🌡️  THERMAL CHECK")
    print("=" * 80)
    
    try:
        import subprocess
        # Run a CPU-intensive task and monitor performance
        Age = BoundedInt(18, 90)
        
        print("Running sustained load test (10 seconds)...")
        samples = []
        start_time = time.perf_counter()
        
        while time.perf_counter() - start_time < 10:
            sample_start = time.perf_counter()
            for _ in range(100_000):
                Age.validate(25)
            sample_elapsed = time.perf_counter() - sample_start
            sample_throughput = 100_000 / sample_elapsed
            samples.append(sample_throughput)
        
        print(f"Samples collected: {len(samples)}")
        print(f"First second avg: {sum(samples[:len(samples)//10]) / (len(samples)//10):,.0f} calls/sec")
        print(f"Last second avg: {sum(samples[-len(samples)//10:]) / (len(samples)//10):,.0f} calls/sec")
        
        first_avg = sum(samples[:len(samples)//10]) / (len(samples)//10)
        last_avg = sum(samples[-len(samples)//10:]) / (len(samples)//10)
        degradation = (first_avg - last_avg) / first_avg * 100
        
        if degradation > 10:
            print(f"⚠️  Performance degraded by {degradation:.1f}% - possible thermal throttling")
        else:
            print(f"✅ Performance stable (degradation: {degradation:.1f}%)")
    except Exception as e:
        print(f"Could not run thermal check: {e}")
    
    print()


def main():
    print_system_info()
    run_warmup_test()
    check_thermal_throttling()
    
    # Run benchmarks
    benchmark_direct_c_extension()
    benchmark_python_wrapper()
    benchmark_full_validation()
    
    print("=" * 80)
    print("📊 DIAGNOSIS COMPLETE")
    print("=" * 80)
    print("Possible reasons for performance differences:")
    print("1. CPU model differences (M1/M2/M3 vs Intel, different generations)")
    print("2. Thermal throttling (laptop vs desktop cooling)")
    print("3. Background processes consuming CPU")
    print("4. Power management settings (battery vs plugged in)")
    print("5. macOS performance mode settings")
    print("6. Different compiler optimizations or library versions")
    print("=" * 80)


if __name__ == "__main__":
    main()
