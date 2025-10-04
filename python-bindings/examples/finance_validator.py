"""
Finance Data Validation Examples
Demonstrates using dhi for financial data validation
"""

from dhi import BoundedInt, BoundedString, ValidationError
from typing import List, Dict
from decimal import Decimal
import json


# ============================================================================
# Fixed Income Validators
# ============================================================================

class FixedIncomeValidator:
    """Validators for fixed income securities"""
    
    # Credit ratings (S&P scale)
    VALID_RATINGS = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", 
                     "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-",
                     "B+", "B", "B-", "CCC+", "CCC", "CCC-", "CC", "C", "D"]
    
    # Validators
    coupon_rate = BoundedInt(0, 20)  # 0-20% coupon
    maturity_years = BoundedInt(1, 30)  # 1-30 years
    face_value = BoundedInt(1000, 1000000)  # $1K - $1M
    cusip = BoundedString(9, 9)  # CUSIP is exactly 9 chars
    isin = BoundedString(12, 12)  # ISIN is exactly 12 chars
    
    @classmethod
    def validate_bond(cls, data: dict) -> dict:
        """Validate bond data"""
        errors = []
        result = {}
        
        try:
            result["cusip"] = cls.cusip.validate(data["cusip"])
        except ValidationError as e:
            errors.append(f"CUSIP: {e}")
        
        try:
            result["coupon_rate"] = cls.coupon_rate.validate(data["coupon_rate"])
        except ValidationError as e:
            errors.append(f"Coupon: {e}")
        
        try:
            result["maturity_years"] = cls.maturity_years.validate(data["maturity_years"])
        except ValidationError as e:
            errors.append(f"Maturity: {e}")
        
        try:
            result["face_value"] = cls.face_value.validate(data["face_value"])
        except ValidationError as e:
            errors.append(f"Face Value: {e}")
        
        # Validate credit rating
        rating = data.get("rating", "")
        if rating not in cls.VALID_RATINGS:
            errors.append(f"Rating: Invalid rating '{rating}'")
        else:
            result["rating"] = rating
        
        if errors:
            raise ValidationError("bond", "; ".join(errors))
        
        return result


# ============================================================================
# Index Membership Validators
# ============================================================================

class IndexValidator:
    """Validate if a company meets index criteria"""
    
    # S&P 500 criteria (simplified)
    market_cap_min = BoundedInt(14_000_000_000, 999_999_999_999)  # $14B minimum
    float_percent = BoundedInt(50, 100)  # 50%+ public float
    consecutive_quarters_profit = BoundedInt(4, 999)  # 4+ quarters profitable
    ticker = BoundedString(1, 5)  # 1-5 char ticker
    
    @classmethod
    def validate_sp500_eligibility(cls, data: dict) -> Dict[str, any]:
        """Check if company meets S&P 500 criteria"""
        errors = []
        result = {}
        
        try:
            result["ticker"] = cls.ticker.validate(data["ticker"])
        except ValidationError as e:
            errors.append(f"Ticker: {e}")
        
        try:
            result["market_cap"] = cls.market_cap_min.validate(data["market_cap"])
        except ValidationError as e:
            errors.append(f"Market Cap: Must be >= $14B (got ${data['market_cap']:,})")
        
        try:
            result["float_percent"] = cls.float_percent.validate(data["float_percent"])
        except ValidationError as e:
            errors.append(f"Float: {e}")
        
        try:
            result["profitable_quarters"] = cls.consecutive_quarters_profit.validate(
                data["profitable_quarters"]
            )
        except ValidationError as e:
            errors.append(f"Profitability: {e}")
        
        # Additional checks
        if data.get("domicile") != "US":
            errors.append("Domicile: Must be US-based")
        else:
            result["domicile"] = "US"
        
        if data.get("exchange") not in ["NYSE", "NASDAQ"]:
            errors.append("Exchange: Must be NYSE or NASDAQ")
        else:
            result["exchange"] = data["exchange"]
        
        result["eligible"] = len(errors) == 0
        result["errors"] = errors
        
        return result


# ============================================================================
# Portfolio Validators
# ============================================================================

class PortfolioValidator:
    """Validate portfolio allocations and constraints"""
    
    allocation_percent = BoundedInt(0, 100)
    position_size = BoundedInt(1000, 10_000_000)
    num_positions = BoundedInt(1, 500)
    
    @classmethod
    def validate_portfolio(cls, positions: List[dict]) -> dict:
        """Validate entire portfolio"""
        errors = []
        total_allocation = 0
        
        # Validate number of positions
        try:
            cls.num_positions.validate(len(positions))
        except ValidationError:
            errors.append(f"Too many positions: {len(positions)} (max 500)")
        
        # Validate each position
        for i, pos in enumerate(positions):
            try:
                allocation = cls.allocation_percent.validate(pos["allocation_percent"])
                total_allocation += allocation
                
                cls.position_size.validate(pos["value"])
            except ValidationError as e:
                errors.append(f"Position {i} ({pos.get('ticker', 'unknown')}): {e}")
        
        # Check total allocation
        if abs(total_allocation - 100) > 0.01:
            errors.append(f"Total allocation must be 100% (got {total_allocation}%)")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_allocation": total_allocation,
            "num_positions": len(positions),
        }


# ============================================================================
# Examples
# ============================================================================

def main():
    print("=" * 80)
    print("💰 FINANCE DATA VALIDATION EXAMPLES")
    print("=" * 80)
    print()
    
    # Example 1: Fixed Income Bond Validation
    print("Example 1: Fixed Income Bond Validation")
    print("-" * 80)
    
    valid_bond = {
        "cusip": "037833100",
        "coupon_rate": 5,
        "maturity_years": 10,
        "face_value": 10000,
        "rating": "AA",
    }
    
    try:
        result = FixedIncomeValidator.validate_bond(valid_bond)
        print(f"✅ Valid bond: {result['cusip']}, {result['coupon_rate']}% coupon, {result['rating']} rated")
    except ValidationError as e:
        print(f"❌ Invalid bond: {e}")
    
    invalid_bond = {
        "cusip": "123",  # Too short
        "coupon_rate": 25,  # Too high
        "maturity_years": 50,  # Too long
        "face_value": 500,  # Too small
        "rating": "INVALID",
    }
    
    try:
        result = FixedIncomeValidator.validate_bond(invalid_bond)
    except ValidationError as e:
        print(f"❌ Invalid bond (expected): {e}")
    
    print()
    
    # Example 2: S&P 500 Index Eligibility
    print("Example 2: S&P 500 Index Eligibility Check")
    print("-" * 80)
    
    eligible_company = {
        "ticker": "AAPL",
        "market_cap": 2_800_000_000_000,  # $2.8T
        "float_percent": 99,
        "profitable_quarters": 40,
        "domicile": "US",
        "exchange": "NASDAQ",
    }
    
    result = IndexValidator.validate_sp500_eligibility(eligible_company)
    if result["eligible"]:
        print(f"✅ {result['ticker']} is ELIGIBLE for S&P 500")
        print(f"   Market Cap: ${result['market_cap']:,}")
        print(f"   Float: {result['float_percent']}%")
    else:
        print(f"❌ Not eligible: {result['errors']}")
    
    ineligible_company = {
        "ticker": "SMALL",
        "market_cap": 5_000_000_000,  # $5B - too small
        "float_percent": 30,  # Too low
        "profitable_quarters": 2,  # Not enough
        "domicile": "CA",  # Not US
        "exchange": "TSX",
    }
    
    result = IndexValidator.validate_sp500_eligibility(ineligible_company)
    print(f"\n❌ {ineligible_company['ticker']} is NOT ELIGIBLE:")
    for error in result["errors"]:
        print(f"   - {error}")
    
    print()
    
    # Example 3: Portfolio Validation
    print("Example 3: Portfolio Allocation Validation")
    print("-" * 80)
    
    valid_portfolio = [
        {"ticker": "AAPL", "allocation_percent": 30, "value": 300000},
        {"ticker": "GOOGL", "allocation_percent": 25, "value": 250000},
        {"ticker": "MSFT", "allocation_percent": 25, "value": 250000},
        {"ticker": "AMZN", "allocation_percent": 20, "value": 200000},
    ]
    
    result = PortfolioValidator.validate_portfolio(valid_portfolio)
    if result["valid"]:
        print(f"✅ Valid portfolio:")
        print(f"   Positions: {result['num_positions']}")
        print(f"   Total Allocation: {result['total_allocation']}%")
    else:
        print(f"❌ Invalid portfolio: {result['errors']}")
    
    invalid_portfolio = [
        {"ticker": "AAPL", "allocation_percent": 60, "value": 600000},
        {"ticker": "GOOGL", "allocation_percent": 60, "value": 600000},  # Total > 100%
    ]
    
    result = PortfolioValidator.validate_portfolio(invalid_portfolio)
    print(f"\n❌ Invalid portfolio:")
    for error in result["errors"]:
        print(f"   - {error}")
    
    print()
    print("=" * 80)
    print("✅ Finance validation examples complete!")
    print("=" * 80)


if __name__ == "__main__":
    main()
