"""
System comparison tool - helps understand performance differences
"""

import platform
import subprocess
import sys

def get_cpu_info():
    """Get detailed CPU information"""
    info = {
        "platform": platform.platform(),
        "processor": platform.processor(),
        "python": sys.version.split()[0],
        "cpu_count": None,
        "cpu_model": None,
        "cpu_freq": None,
    }
    
    try:
        info["cpu_count"] = subprocess.check_output(
            ["sysctl", "-n", "hw.ncpu"], text=True
        ).strip()
    except:
        pass
    
    try:
        info["cpu_model"] = subprocess.check_output(
            ["sysctl", "-n", "machdep.cpu.brand_string"], text=True
        ).strip()
    except:
        pass
    
    try:
        freq = subprocess.check_output(
            ["sysctl", "-n", "hw.cpufrequency"], text=True
        ).strip()
        info["cpu_freq"] = f"{int(freq) / 1e9:.2f} GHz"
    except:
        pass
    
    return info

def print_system_comparison():
    """Print system information for comparison"""
    print("=" * 80)
    print("🖥️  SYSTEM INFORMATION FOR COMPARISON")
    print("=" * 80)
    
    info = get_cpu_info()
    
    print(f"\n📋 Copy this information when reporting benchmarks:\n")
    print(f"System: {info['cpu_model'] or 'Unknown'}")
    print(f"CPU Cores: {info['cpu_count'] or 'Unknown'}")
    print(f"CPU Freq: {info['cpu_freq'] or 'Unknown'}")
    print(f"Platform: {info['platform']}")
    print(f"Python: {info['python']}")
    
    # Detect system type
    if info['cpu_model']:
        if 'M3 Ultra' in info['cpu_model']:
            system_type = "Mac Studio (M3 Ultra)"
            expected_perf = "25M+ calls/sec, 4.4M+ users/sec"
        elif 'M3' in info['cpu_model']:
            system_type = "MacBook Pro/Air (M3)"
            expected_perf = "20-23M calls/sec, 3.5-4M users/sec"
        elif 'M2' in info['cpu_model']:
            system_type = "MacBook Pro/Air (M2)"
            expected_perf = "18-20M calls/sec, 2.5-3M users/sec"
        elif 'M1' in info['cpu_model']:
            system_type = "MacBook Pro/Air (M1)"
            expected_perf = "15-18M calls/sec, 2-2.5M users/sec"
        else:
            system_type = "Unknown Mac"
            expected_perf = "Varies"
    else:
        system_type = "Unknown"
        expected_perf = "Unknown"
    
    print(f"\n🎯 Detected System: {system_type}")
    print(f"📊 Expected Performance: {expected_perf}")
    
    print("\n" + "=" * 80)
    print("💡 TIPS FOR ACCURATE BENCHMARKS")
    print("=" * 80)
    print("""
1. Close unnecessary applications
2. Plug in laptop (if applicable)
3. Disable power saving mode
4. Let system warm up (run benchmark twice)
5. Run multiple times and average results
6. Use the project's .venv environment

Run benchmarks with:
    cd python-bindings
    ./run_benchmark_venv.sh
""")
    
    print("=" * 80)
    print("📝 BENCHMARK TEMPLATE")
    print("=" * 80)
    print(f"""
Copy this template and fill in your results:

## Benchmark Results

**System**: {info['cpu_model'] or 'Unknown'}
**CPU**: {info['cpu_count'] or 'Unknown'} cores
**Python**: {info['python']}
**Date**: [Today's date]

### Performance

```
Direct C Extension:    [X]M calls/sec ([Y]ns per call)
Python Wrapper:        [X]M calls/sec ([Y]ns per call)
Real-world Validation: [X]M users/sec
```

### Comparison

- dhi: [X]M users/sec
- satya: [X]M users/sec
- Speedup: [X]x

### Notes

- [Any observations about thermal throttling, variance, etc.]
```
""")

if __name__ == "__main__":
    print_system_comparison()
