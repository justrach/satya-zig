"""
Advanced Type Checking with dhi
Runtime type validation for Python applications
"""

from dhi import BoundedInt, BoundedString, Email, ValidationError
from typing import Any, Dict, List, get_type_hints
import inspect


# ============================================================================
# Runtime Type Checker
# ============================================================================

class TypeChecker:
    """Runtime type validation using dhi validators"""
    
    # Map Python types to dhi validators
    TYPE_VALIDATORS = {
        int: lambda: BoundedInt(-2**63, 2**63-1),  # i64 range
        str: lambda: BoundedString(0, 10000),  # Reasonable string limit
    }
    
    @classmethod
    def validate_function_args(cls, func, *args, **kwargs):
        """Validate function arguments at runtime"""
        sig = inspect.signature(func)
        type_hints = get_type_hints(func)
        
        # Bind arguments
        bound = sig.bind(*args, **kwargs)
        bound.apply_defaults()
        
        errors = []
        
        for param_name, param_value in bound.arguments.items():
            if param_name in type_hints:
                expected_type = type_hints[param_name]
                
                # Check basic type
                if expected_type in cls.TYPE_VALIDATORS:
                    validator = cls.TYPE_VALIDATORS[expected_type]()
                    try:
                        validator.validate(param_value)
                    except ValidationError as e:
                        errors.append(f"{param_name}: {e}")
        
        if errors:
            raise ValidationError("arguments", "; ".join(errors))
        
        return bound.arguments
    
    @classmethod
    def checked(cls, func):
        """Decorator for runtime type checking"""
        def wrapper(*args, **kwargs):
            cls.validate_function_args(func, *args, **kwargs)
            return func(*args, **kwargs)
        return wrapper


# ============================================================================
# API Request Validators
# ============================================================================

class APIRequestValidator:
    """Validate API request payloads"""
    
    @staticmethod
    def validate_user_registration(data: dict) -> dict:
        """Validate user registration data"""
        username = BoundedString(3, 20)
        password = BoundedString(8, 100)
        age = BoundedInt(13, 120)
        
        return {
            "username": username.validate(data["username"]),
            "email": Email.validate(data["email"]),
            "password": password.validate(data["password"]),
            "age": age.validate(data["age"]),
        }
    
    @staticmethod
    def validate_payment(data: dict) -> dict:
        """Validate payment transaction"""
        amount = BoundedInt(1, 1_000_000)  # $0.01 - $10,000.00 (in cents)
        card_number = BoundedString(13, 19)  # Credit card length
        cvv = BoundedString(3, 4)
        
        return {
            "amount": amount.validate(data["amount"]),
            "card_number": card_number.validate(data["card_number"]),
            "cvv": cvv.validate(data["cvv"]),
            "email": Email.validate(data["email"]),
        }


# ============================================================================
# Data Quality Checker
# ============================================================================

class DataQualityChecker:
    """Check data quality for ML/Analytics pipelines"""
    
    @staticmethod
    def check_dataset(data: List[dict], schema: dict) -> dict:
        """Check entire dataset for quality issues"""
        total = len(data)
        valid = 0
        errors_by_field = {}
        
        for row_idx, row in enumerate(data):
            for field, validator in schema.items():
                try:
                    validator.validate(row[field])
                except ValidationError as e:
                    if field not in errors_by_field:
                        errors_by_field[field] = []
                    errors_by_field[field].append((row_idx, str(e)))
                except KeyError:
                    if field not in errors_by_field:
                        errors_by_field[field] = []
                    errors_by_field[field].append((row_idx, "Missing field"))
            
            # Count valid rows (all fields passed)
            if not any(
                any(err[0] == row_idx for err in errors)
                for errors in errors_by_field.values()
            ):
                valid += 1
        
        return {
            "total_rows": total,
            "valid_rows": valid,
            "invalid_rows": total - valid,
            "quality_score": (valid / total * 100) if total > 0 else 0,
            "errors_by_field": {
                field: len(errors)
                for field, errors in errors_by_field.items()
            },
            "sample_errors": {
                field: errors[:3]  # First 3 errors per field
                for field, errors in errors_by_field.items()
            },
        }


# ============================================================================
# Examples
# ============================================================================

def main():
    print("=" * 80)
    print("🔍 ADVANCED TYPE CHECKING & VALIDATION EXAMPLES")
    print("=" * 80)
    print()
    
    # Example 1: Runtime Type Checking
    print("Example 1: Runtime Type Checking with Decorator")
    print("-" * 80)
    
    @TypeChecker.checked
    def calculate_interest(principal: int, rate: int, years: int) -> float:
        """Calculate compound interest"""
        return principal * (1 + rate/100) ** years
    
    try:
        result = calculate_interest(10000, 5, 10)
        print(f"✅ Valid calculation: ${result:,.2f}")
    except ValidationError as e:
        print(f"❌ Invalid arguments: {e}")
    
    try:
        result = calculate_interest(10000, 150, 10)  # Invalid rate
    except ValidationError as e:
        print(f"❌ Invalid rate (expected): {e}")
    
    print()
    
    # Example 2: API Request Validation
    print("Example 2: API Request Validation")
    print("-" * 80)
    
    valid_registration = {
        "username": "alice123",
        "email": "alice@example.com",
        "password": "SecurePass123!",
        "age": 28,
    }
    
    try:
        result = APIRequestValidator.validate_user_registration(valid_registration)
        print(f"✅ Valid registration: {result['username']}")
    except ValidationError as e:
        print(f"❌ Invalid registration: {e}")
    
    invalid_registration = {
        "username": "ab",  # Too short
        "email": "not-an-email",
        "password": "weak",  # Too short
        "age": 10,  # Too young
    }
    
    try:
        result = APIRequestValidator.validate_user_registration(invalid_registration)
    except ValidationError as e:
        print(f"❌ Invalid registration (expected): {e}")
    
    print()
    
    # Example 3: Payment Validation
    print("Example 3: Payment Transaction Validation")
    print("-" * 80)
    
    valid_payment = {
        "amount": 9999,  # $99.99
        "card_number": "4532123456789012",
        "cvv": "123",
        "email": "customer@example.com",
    }
    
    try:
        result = APIRequestValidator.validate_payment(valid_payment)
        print(f"✅ Valid payment: ${result['amount']/100:.2f}")
    except ValidationError as e:
        print(f"❌ Invalid payment: {e}")
    
    print()
    
    # Example 4: Data Quality Checking
    print("Example 4: Data Quality Checking for ML Pipeline")
    print("-" * 80)
    
    dataset = [
        {"age": 25, "income": 50000, "score": 750},
        {"age": 30, "income": 75000, "score": 800},
        {"age": 200, "income": 60000, "score": 700},  # Invalid age
        {"age": 28, "income": -1000, "score": 650},   # Invalid income
        {"age": 35, "income": 90000, "score": 850},
    ]
    
    schema = {
        "age": BoundedInt(18, 120),
        "income": BoundedInt(0, 10_000_000),
        "score": BoundedInt(300, 850),
    }
    
    quality_report = DataQualityChecker.check_dataset(dataset, schema)
    
    print(f"Dataset Quality Report:")
    print(f"  Total rows: {quality_report['total_rows']}")
    print(f"  Valid rows: {quality_report['valid_rows']}")
    print(f"  Invalid rows: {quality_report['invalid_rows']}")
    print(f"  Quality score: {quality_report['quality_score']:.1f}%")
    print(f"\nErrors by field:")
    for field, count in quality_report['errors_by_field'].items():
        print(f"  {field}: {count} errors")
    
    print()
    
    # Example 5: Index Eligibility
    print("Example 5: S&P 500 Index Eligibility")
    print("-" * 80)
    
    companies = [
        {
            "ticker": "NVDA",
            "market_cap": 1_200_000_000_000,
            "float_percent": 99,
            "profitable_quarters": 20,
            "domicile": "US",
            "exchange": "NASDAQ",
        },
        {
            "ticker": "SMALL",
            "market_cap": 5_000_000_000,  # Too small
            "float_percent": 40,  # Too low
            "profitable_quarters": 2,  # Not enough
            "domicile": "US",
            "exchange": "NASDAQ",
        },
    ]
    
    for company in companies:
        result = IndexValidator.validate_sp500_eligibility(company)
        if result["eligible"]:
            print(f"✅ {result['ticker']}: ELIGIBLE")
        else:
            print(f"❌ {company['ticker']}: NOT ELIGIBLE")
            for error in result["errors"][:2]:  # Show first 2 errors
                print(f"   - {error}")
    
    print()
    print("=" * 80)
    print("✅ All examples complete!")
    print("=" * 80)


if __name__ == "__main__":
    main()
