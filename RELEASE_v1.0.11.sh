#!/bin/bash
set -e

echo "🚀 Releasing dhi v1.0.11"
echo ""
echo "This will:"
echo "  1. Commit version bump"
echo "  2. Create git tag v1.0.11"
echo "  3. Push to GitHub"
echo "  4. Trigger automated wheel building"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

cd /Users/rachpradhan/satya-zig

# Add all changes
git add -A

# Commit
git commit -m "Release v1.0.11 - Multi-platform wheels with GitHub Actions

- Add GitHub Actions workflow for building wheels
- Support macOS (x86_64 + arm64), Linux (x86_64), Windows (x86_64)
- Python 3.8-3.13 support
- Automated PyPI publishing
- 23M validations/sec performance
"

# Create tag
git tag -a v1.0.11 -m "Release v1.0.11 - Ultra-fast validation with pre-built wheels"

# Push
echo ""
echo "Pushing to GitHub..."
git push origin main
git push origin v1.0.11

echo ""
echo "✅ Released! GitHub Actions will now:"
echo "   1. Build Zig library for all platforms"
echo "   2. Build Python wheels"
echo "   3. Publish to PyPI"
echo ""
echo "Monitor progress at:"
echo "https://github.com/justrach/satya-zig/actions"
echo ""
echo "Once complete, install with:"
echo "  pip install dhi==1.0.11"
