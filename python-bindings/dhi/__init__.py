"""
dhi - High-performance data validation for Python, powered by Zig

A Python wrapper around satya-zig, providing blazing-fast validation
with a Pydantic-like API.
"""

__version__ = "0.1.0"
__author__ = "Rach Pradhan"

from .validator import (
    BoundedInt,
    BoundedString,
    Email,
    ValidationError,
    ValidationErrors,
    HAS_NATIVE_EXT,
)

# Try to import native extension
try:
    from . import _dhi_native
except ImportError:
    _dhi_native = None

__all__ = [
    "BoundedInt",
    "BoundedString", 
    "Email",
    "ValidationError",
    "ValidationErrors",
    "HAS_NATIVE_EXT",
    "_dhi_native",
]
