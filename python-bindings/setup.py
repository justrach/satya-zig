"""
Setup script for dhi - High-performance data validation for Python
"""

from setuptools import setup, find_packages, Extension
from pathlib import Path
import os

# Read README
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text() if readme_file.exists() else ""

# Path to Zig library
zig_lib_path = Path(__file__).parent.parent / "zig-out" / "lib"

# Define native extension
native_ext = Extension(
    'dhi._dhi_native',
    sources=['dhi/_native.c'],
    include_dirs=[],
    library_dirs=[str(zig_lib_path)],
    libraries=['satya'],
    runtime_library_dirs=[str(zig_lib_path)] if os.name != 'nt' else [],
    extra_compile_args=['-O3'],
)

setup(
    name="dhi",
    version="0.1.0",
    author="Rach Pradhan",
    author_email="rach@example.com",
    description="High-performance data validation for Python, powered by Zig",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/justrach/satya-zig",
    packages=find_packages(),
    ext_modules=[native_ext],
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        # No dependencies for pure Python version
        # Future: Add cffi for native bindings
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-benchmark>=4.0",
            "black>=23.0",
            "mypy>=1.0",
        ],
    },
    keywords="validation data-validation pydantic zig performance",
    project_urls={
        "Bug Reports": "https://github.com/justrach/satya-zig/issues",
        "Source": "https://github.com/justrach/satya-zig",
        "Documentation": "https://github.com/justrach/satya-zig#readme",
    },
)
