"""
Tests for dhi validators
"""

import pytest
from dhi import BoundedInt, BoundedString, Email, ValidationError


class TestBoundedInt:
    def test_valid_value(self):
        Age = BoundedInt(18, 90)
        assert Age.validate(25) == 25
        assert Age.validate(18) == 18
        assert Age.validate(90) == 90
    
    def test_below_min(self):
        Age = BoundedInt(18, 90)
        with pytest.raises(ValidationError) as exc:
            Age.validate(15)
        assert "must be >= 18" in str(exc.value)
    
    def test_above_max(self):
        Age = BoundedInt(18, 90)
        with pytest.raises(ValidationError) as exc:
            Age.validate(100)
        assert "must be <= 90" in str(exc.value)
    
    def test_type_error(self):
        Age = BoundedInt(18, 90)
        with pytest.raises(ValidationError) as exc:
            Age.validate("25")
        assert "Expected int" in str(exc.value)
    
    def test_callable(self):
        Age = BoundedInt(18, 90)
        assert Age(25) == 25


class TestBoundedString:
    def test_valid_value(self):
        Name = BoundedString(1, 40)
        assert Name.validate("Alice") == "Alice"
        assert Name.validate("A") == "A"
        assert Name.validate("A" * 40) == "A" * 40
    
    def test_too_short(self):
        Name = BoundedString(3, 40)
        with pytest.raises(ValidationError) as exc:
            Name.validate("AB")
        assert "must be >= 3" in str(exc.value)
    
    def test_too_long(self):
        Name = BoundedString(1, 10)
        with pytest.raises(ValidationError) as exc:
            Name.validate("A" * 11)
        assert "must be <= 10" in str(exc.value)
    
    def test_type_error(self):
        Name = BoundedString(1, 40)
        with pytest.raises(ValidationError) as exc:
            Name.validate(123)
        assert "Expected str" in str(exc.value)
    
    def test_callable(self):
        Name = BoundedString(1, 40)
        assert Name("Alice") == "Alice"


class TestEmail:
    def test_valid_email(self):
        assert Email.validate("user@example.com") == "user@example.com"
        assert Email.validate("alice@test.org") == "alice@test.org"
    
    def test_invalid_format(self):
        with pytest.raises(ValidationError) as exc:
            Email.validate("not-an-email")
        assert "Invalid email format" in str(exc.value)
    
    def test_missing_at(self):
        with pytest.raises(ValidationError) as exc:
            Email.validate("userexample.com")
        assert "Invalid email format" in str(exc.value)
    
    def test_type_error(self):
        with pytest.raises(ValidationError) as exc:
            Email.validate(123)
        assert "Expected str" in str(exc.value)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
