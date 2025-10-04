# Release Process for dhi

## Automated Release with GitHub Actions

This repository uses GitHub Actions to automatically build wheels for multiple platforms and publish to PyPI.

### How to Release

1. **Update version** in `python-bindings/pyproject.toml`
2. **Commit changes**:
   ```bash
   git add python-bindings/pyproject.toml
   git commit -m "Bump version to 1.0.11"
   ```

3. **Create and push a tag**:
   ```bash
   git tag v1.0.11
   git push origin main
   git push origin v1.0.11
   ```

4. **GitHub Actions will automatically**:
   - Build Zig library for all platforms
   - Build Python wheels for:
     - macOS (x86_64 + arm64)
     - Linux (x86_64)
     - Windows (x86_64)
   - Python versions: 3.8, 3.9, 3.10, 3.11, 3.12, 3.13
   - Publish to PyPI

### Manual Trigger

You can also manually trigger the workflow from the GitHub Actions tab.

### Requirements

- **GitHub Secret**: `PYPI_API_TOKEN` must be set in repository secrets
  - Get token from: https://pypi.org/manage/account/token/
  - Add to: Repository Settings → Secrets and variables → Actions → New repository secret

### Platforms Built

| Platform | Architectures | Python Versions |
|----------|--------------|-----------------|
| macOS | x86_64, arm64 | 3.8-3.13 |
| Linux | x86_64 | 3.8-3.13 |
| Windows | x86_64 | 3.8-3.13 |

### What Gets Published

- **Wheels**: Pre-compiled binaries with Zig library (23M validations/sec)
- **Source dist**: Fallback pure Python version

### Testing Before Release

```bash
# Build locally
cd python-bindings
python setup.py bdist_wheel

# Test the wheel
pip install dist/dhi-*.whl
python -c "from dhi import _dhi_native; print('✅ Works!')"
```

### Troubleshooting

**If build fails:**
1. Check Zig version (0.15.1 required)
2. Verify library paths in setup.py
3. Check GitHub Actions logs

**If PyPI upload fails:**
1. Verify PYPI_API_TOKEN secret is set
2. Check version number isn't already published
3. Ensure tag format is `v*` (e.g., v1.0.11)

---

**Current version**: 1.0.11
**Performance**: 23M validations/sec
**Status**: Ready for automated release! 🚀
