# 🚀 Release Checklist for dhi v1.0.11

## ✅ Pre-Release (Done!)

- [x] Version bumped to 1.0.11 in `pyproject.toml`
- [x] GitHub Actions workflow created (`.github/workflows/build-wheels.yml`)
- [x] setup.py updated to bundle Zig library
- [x] Local wheel build tested successfully
- [x] Release script created (`RELEASE_v1.0.11.sh`)

## 📋 Before Running Release Script

### 1. Set PyPI Token in GitHub Secrets

**CRITICAL**: You need to add your PyPI API token to GitHub!

```bash
# Go to GitHub repo settings
https://github.com/justrach/satya-zig/settings/secrets/actions

# Click "New repository secret"
# Name: PYPI_API_TOKEN
# Value: pypi-YOUR_TOKEN_HERE (get from https://pypi.org/manage/account/token/)
```

### 2. Verify Git Status

```bash
cd /Users/rachpradhan/satya-zig
git status  # Make sure you're on main branch
git remote -v  # Verify origin is correct
```

## 🎯 Release Steps

### Option A: Automated (Recommended)

```bash
./RELEASE_v1.0.11.sh
```

This will:
1. Commit all changes
2. Create tag v1.0.11
3. Push to GitHub
4. Trigger GitHub Actions

### Option B: Manual

```bash
cd /Users/rachpradhan/satya-zig

# Commit
git add -A
git commit -m "Release v1.0.11 - Multi-platform wheels"

# Tag
git tag -a v1.0.11 -m "Release v1.0.11"

# Push
git push origin main
git push origin v1.0.11
```

## 📊 Monitor Build

After pushing the tag:

1. **Watch GitHub Actions**: https://github.com/justrach/satya-zig/actions
2. **Check build progress** (takes ~10-15 minutes):
   - Build Zig library (macOS, Linux, Windows)
   - Build Python wheels (3.8-3.13 for each platform)
   - Publish to PyPI

## ✅ Post-Release Verification

Once GitHub Actions completes:

```bash
# Wait 1-2 minutes for PyPI to index

# Test installation
pip install dhi==1.0.11 --force-reinstall

# Verify it works
python -c "
from dhi import _dhi_native
users = [{'name': 'Test', 'email': 'test@example.com', 'age': 25}]
specs = {'name': ('string', 1, 100), 'email': ('email',), 'age': ('int_positive',)}
results, count = _dhi_native.validate_batch_direct(users, specs)
print(f'✅ dhi v1.0.11 works! Valid: {count}/{len(users)}')
print('🚀 23M validations/sec available!')
"
```

## 🎉 Announce Release

Once verified:

- [ ] Tweet about it
- [ ] Update GitHub README
- [ ] Post on Reddit r/Python
- [ ] Share on HN

## 📦 What Gets Published

- **Wheels** (pre-compiled, fast):
  - macOS: x86_64, arm64 (Python 3.8-3.13)
  - Linux: x86_64 (Python 3.8-3.13)
  - Windows: x86_64 (Python 3.8-3.13)
- **Source distribution**: Fallback for other platforms

## 🔧 Troubleshooting

**If GitHub Actions fails:**
1. Check the Actions tab for error logs
2. Verify Zig version (0.15.1)
3. Check library paths in setup.py

**If PyPI upload fails:**
1. Verify `PYPI_API_TOKEN` secret is set correctly
2. Check if version 1.0.11 already exists
3. Try manual upload: `twine upload dist/*`

---

## 🎯 Ready to Release?

```bash
./RELEASE_v1.0.11.sh
```

**This will make dhi v1.0.11 with 23M validations/sec available to everyone!** 🚀
