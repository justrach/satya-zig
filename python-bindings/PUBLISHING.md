# Publishing dhi to PyPI

## Prerequisites

1. Create accounts on:
   - **PyPI**: https://pypi.org/account/register/
   - **TestPyPI** (for testing): https://test.pypi.org/account/register/

2. Install publishing tools:
```bash
pip install build twine
```

## Build the Package

```bash
cd python-bindings
python -m build
```

This creates:
- `dist/dhi-0.1.0-py3-none-any.whl` (wheel)
- `dist/dhi-0.1.0.tar.gz` (source distribution)

## Test on TestPyPI First

```bash
# Upload to TestPyPI
python -m twine upload --repository testpypi dist/*

# Test installation
pip install --index-url https://test.pypi.org/simple/ dhi

# Try it out
python -c "from dhi import BoundedInt; print(BoundedInt(1, 10).validate(5))"
```

## Publish to PyPI

```bash
# Upload to real PyPI
python -m twine upload dist/*

# You'll be prompted for:
# - Username (or use __token__)
# - Password (or API token)
```

## Using API Tokens (Recommended)

1. Go to https://pypi.org/manage/account/token/
2. Create a new API token
3. Save it securely
4. Create `~/.pypirc`:

```ini
[pypi]
username = __token__
password = pypi-AgEIcHlwaS5vcmc...your-token-here...
```

## Verify Installation

```bash
pip install dhi
python -c "from dhi import BoundedInt, Email; print('✅ dhi installed!')"
```

## Update Version

To release a new version:

1. Update version in:
   - `pyproject.toml`
   - `setup.py`
   - `dhi/__init__.py`

2. Rebuild and republish:
```bash
rm -rf dist/
python -m build
python -m twine upload dist/*
```

## Current Status

- ✅ Package built successfully
- ✅ Tests passing
- ✅ Example working
- ⏳ Ready to publish to PyPI!

## Quick Publish Commands

```bash
# Clean build
rm -rf dist/ build/ *.egg-info

# Build
python -m build

# Test on TestPyPI
twine upload --repository testpypi dist/*

# Publish to PyPI (when ready)
twine upload dist/*
```

## After Publishing

1. Test installation: `pip install dhi`
2. Update README with PyPI badge
3. Announce on social media
4. Add to awesome-zig list
