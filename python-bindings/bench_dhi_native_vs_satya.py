"""
Benchmark: dhi native extension vs satya

This benchmark uses ONLY the native CPython extension for dhi
(`dhi._dhi_native`) to measure true native performance, and compares
against `satya` if it is installed.

Usage:
  PYTHONPATH=python-bindings python3 python-bindings/bench_dhi_native_vs_satya.py [--n 100000]

Notes:
- Requires the compiled native extension `_dhi_native` and the Zig dylib
  in `zig-out/lib` to be discoverable at runtime.
- On macOS, you may need:
    export DYLD_LIBRARY_PATH=$PWD/zig-out/lib:$DYLD_LIBRARY_PATH
"""

import argparse
import json
import time
from typing import List, Dict


def generate_test_data(n: int) -> List[Dict]:
    """Generate synthetic user data."""
    out = []
    for i in range(n):
        out.append(
            {
                "id": i,
                "name": f"User{i}",
                "email": f"user{i}@example.com",
                "age": 20 + (i % 50),
                "active": (i % 2 == 0),
            }
        )
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=100_000, help="Number of users")
    args = parser.parse_args()

    # Import native dhi extension (directly load the C extension module)
    try:
        import importlib
        _dhi_native = importlib.import_module("dhi._dhi_native")
        HAS_NATIVE_EXT = True
    except Exception as e:
        print(f"❌ Failed to import dhi native extension: {e}")
        print("Build it with: zig build && (cd python-bindings && python3 setup.py build_ext --inplace)")
        return

    # Optional: satya
    try:
        from satya import Model, Field
        HAS_SATYA = True
    except Exception:
        HAS_SATYA = False

    print("=" * 80)
    print("🚀 Benchmark: dhi native vs satya")
    print("=" * 80)
    print(f"Native extension: {'✅' if HAS_NATIVE_EXT else '❌'}")
    if HAS_NATIVE_EXT:
        try:
            print(f"Native module path: {_dhi_native.__file__}")
            import inspect
            print("Native callables:", [n for n, obj in vars(_dhi_native).items() if callable(obj)])
        except Exception:
            pass
    print(f"satya installed:  {'✅' if HAS_SATYA else '❌'}")
    print()

    # Data
    n = args.n
    users = generate_test_data(n)

    # Warmup
    try:
        _ = _dhi_native.validate_users_batch(users)
    except Exception as e:
        print(f"❌ _dhi_native.validate_users_batch failed: {e}")
        return

    # Benchmark: dhi native batch (single FFI call)
    start = time.perf_counter()
    results = _dhi_native.validate_users_batch(users)
    elapsed_dhi = time.perf_counter() - start
    throughput_dhi = n / elapsed_dhi if elapsed_dhi > 0 else float("inf")
    valid_dhi = int(sum(1 for r in results if r))

    print("dhi (Native C extension, batch API):")
    print(f"  Items:      {n:,}")
    print(f"  Time:       {elapsed_dhi:.4f}s")
    print(f"  Throughput: {throughput_dhi:,.0f} items/sec")
    print(f"  Valid:      {valid_dhi:,}/{n:,}")
    print()

    # Benchmark: pure Python fallback by disabling native at runtime
    try:
        from dhi import validator as dhi_validator

        # Force pure Python path
        dhi_validator.HAS_NATIVE_EXT = False
        try:
            dhi_validator._zig._lib = None  # ensure _zig.available is False
        except Exception:
            pass

        Name = dhi_validator.BoundedString(1, 100)
        Age = dhi_validator.BoundedInt(18, 120)

        start = time.perf_counter()
        valid_count_py = 0
        for u in users:
            try:
                Name.validate(u["name"])
                dhi_validator.Email.validate(u["email"])
                Age.validate(u["age"])
                valid_count_py += 1
            except Exception:
                pass
        elapsed_py = time.perf_counter() - start
        throughput_py = n / elapsed_py if elapsed_py > 0 else float("inf")

        print("dhi (Pure Python fallback):")
        print(f"  Items:      {n:,}")
        print(f"  Time:       {elapsed_py:.4f}s")
        print(f"  Throughput: {throughput_py:,.0f} items/sec")
        print(f"  Valid:      {valid_count_py:,}/{n:,}")
        print()
    except Exception as e:
        print(f"⚠️  Skipped pure Python baseline: {e}")
        elapsed_py = None
        throughput_py = None

    # Benchmark: satya (if available) using fast JSON array path
    if HAS_SATYA:
        class SatyaUser(Model):
            id: int
            name: str = Field(min_length=1, max_length=100)
            email: str = Field(email=True)
            age: int = Field(ge=18, le=120)
            active: bool

        json_bytes = json.dumps(users).encode()
        # Warmup
        try:
            _ = SatyaUser.model_validate_json_array_bytes(json_bytes)
        except Exception as e:
            print(f"❌ satya warmup failed: {e}")
            HAS_SATYA = False

    if HAS_SATYA:
        start = time.perf_counter()
        _ = SatyaUser.model_validate_json_array_bytes(json_bytes)
        elapsed_satya = time.perf_counter() - start
        throughput_satya = n / elapsed_satya if elapsed_satya > 0 else float("inf")

        print("satya (Rust backend, JSON array path):")
        print(f"  Items:      {n:,}")
        print(f"  Time:       {elapsed_satya:.4f}s")
        print(f"  Throughput: {throughput_satya:,.0f} items/sec")
        print()

        # Comparisons
        if throughput_dhi and throughput_satya:
            print(f"satya vs dhi native: {throughput_satya/throughput_dhi:.2f}x")
        if throughput_py and throughput_satya:
            print(f"satya vs dhi python: {throughput_satya/throughput_py:.2f}x")
        if throughput_py and throughput_dhi:
            print(f"dhi native vs python: {throughput_dhi/throughput_py:.2f}x")

    print()
    print("Notes:")
    print("- dhi native uses the CPython C extension (_dhi_native) in a single batch call")
    print("- dhi pure python forces the fallback path (no native ext, no ctypes)")
    print("- satya uses its fast JSON array path via PyO3")


if __name__ == "__main__":
    main()
