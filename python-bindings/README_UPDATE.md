# dhi v1.0.1 - Published!

## 🎉 Successfully Published to PyPI!

**Install:** `pip install dhi`

## ⚠️ Important Note

**v1.0.1** provides the pure Python implementation. The ultra-fast Zig-powered version (23M validations/sec) requires building from source.

### For Ultra-Fast Performance (23M validations/sec):

```bash
# Clone and build locally
git clone https://github.com/justrach/satya-zig.git
cd satya-zig
zig build -Doptimize=ReleaseFast
cd python-bindings
pip install -e .
```

### Pure Python Version (from PyPI):

```bash
pip install dhi
```

Works immediately but uses pure Python validators (~200K validations/sec).

## Next Steps

To make the fast version available on PyPI, we need to:
1. Build platform-specific wheels (macOS, Linux, Windows)
2. Use cibuildwheel for CI/CD
3. Upload pre-compiled wheels

For now: **Pure Python works everywhere, fast version requires local build.**

---

**dhi v1.0.1 is live at:** https://pypi.org/project/dhi/
