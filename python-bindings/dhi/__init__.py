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
)

__all__ = [
    "BoundedInt",
    "BoundedString", 
    "Email",
    "ValidationError",
    "ValidationErrors",
]
