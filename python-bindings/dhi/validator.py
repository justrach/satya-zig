"""
Core validation classes for dhi
"""

import ctypes
import os
from pathlib import Path
from typing import Any, Dict, List, Optional


class ValidationError(Exception):
    """Single validation error"""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


class ValidationErrors(Exception):
    """Multiple validation errors"""
    def __init__(self, errors: List[ValidationError]):
        self.errors = errors
        messages = "\n".join(str(e) for e in errors)
        super().__init__(f"Validation failed:\n{messages}")


class BoundedInt:
    """Integer with min/max bounds validation"""
    
    def __init__(self, min_val: int, max_val: int):
        self.min_val = min_val
        self.max_val = max_val
    
    def validate(self, value: int) -> int:
        """Validate integer is within bounds"""
        if not isinstance(value, int):
            raise ValidationError("value", f"Expected int, got {type(value).__name__}")
        
        if value < self.min_val:
            raise ValidationError("value", f"Value {value} must be >= {self.min_val}")
        
        if value > self.max_val:
            raise ValidationError("value", f"Value {value} must be <= {self.max_val}")
        
        return value
    
    def __call__(self, value: int) -> int:
        """Allow using as a callable validator"""
        return self.validate(value)


class BoundedString:
    """String with length bounds validation"""
    
    def __init__(self, min_len: int, max_len: int):
        self.min_len = min_len
        self.max_len = max_len
    
    def validate(self, value: str) -> str:
        """Validate string length is within bounds"""
        if not isinstance(value, str):
            raise ValidationError("value", f"Expected str, got {type(value).__name__}")
        
        if len(value) < self.min_len:
            raise ValidationError("value", f"String length {len(value)} must be >= {self.min_len}")
        
        if len(value) > self.max_len:
            raise ValidationError("value", f"String length {len(value)} must be <= {self.max_len}")
        
        return value
    
    def __call__(self, value: str) -> str:
        """Allow using as a callable validator"""
        return self.validate(value)


class Email:
    """Email format validation"""
    
    @staticmethod
    def validate(value: str) -> str:
        """Validate email format (simple check)"""
        if not isinstance(value, str):
            raise ValidationError("value", f"Expected str, got {type(value).__name__}")
        
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValidationError("value", "Invalid email format (expected: local@domain)")
        
        return value
    
    @staticmethod
    def __call__(value: str) -> str:
        """Allow using as a callable validator"""
        return Email.validate(value)


# TODO: Load Zig shared library for native performance
# This is a pure Python implementation for now
# Future: Use ctypes to call into libsatya.so for 100x+ speedup

class _ZigValidator:
    """Native Zig validator (future implementation)"""
    
    def __init__(self):
        self._lib = None
        self._try_load_native()
    
    def _try_load_native(self):
        """Try to load native Zig library"""
        lib_path = Path(__file__).parent.parent.parent / "zig-out" / "lib"
        
        # Try different library names
        for name in ["libsatya.so", "libsatya.dylib", "satya.dll"]:
            full_path = lib_path / name
            if full_path.exists():
                try:
                    self._lib = ctypes.CDLL(str(full_path))
                    print(f"✅ Loaded native Zig library: {name}")
                    return
                except Exception as e:
                    print(f"⚠️  Failed to load {name}: {e}")
        
        print("ℹ️  Using pure Python implementation (slower)")
    
    @property
    def available(self) -> bool:
        """Check if native library is available"""
        return self._lib is not None


# Global instance
_zig = _ZigValidator()
