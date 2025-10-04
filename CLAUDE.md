# Claude/LLM Integration Guide

## Using Satya-Zig with AI Assistants

This guide shows how to use satya-zig and dhi for validating AI-generated data, API responses, and structured outputs.

## Quick Start for AI Tools

### Python (Recommended for AI Agents)

```python
from dhi import BoundedInt, BoundedString, Email, ValidationError

# Validate AI-generated user data
class UserValidator:
    age = BoundedInt(18, 120)
    name = BoundedString(1, 100)
    
    @staticmethod
    def validate(data: dict) -> dict:
        """Validate user data from AI/API"""
        return {
            "name": UserValidator.name.validate(data["name"]),
            "email": Email.validate(data["email"]),
            "age": UserValidator.age.validate(data["age"]),
        }

# Use with Claude/GPT outputs
ai_response = {
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "age": 28
}

try:
    validated = UserValidator.validate(ai_response)
    print(f"✅ Valid: {validated}")
except ValidationError as e:
    print(f"❌ Invalid AI output: {e}")
```

### Zig (For High-Performance Tools)

```zig
const satya = @import("satya");

const Age = satya.BoundedInt(u8, 18, 120);
const Name = satya.BoundedString(1, 100);

// Validate structured data
const user_age = try Age.init(28);
const user_name = try Name.init("Alice");
```

## Common AI Use Cases

### 1. Validating LLM JSON Outputs

```python
from dhi import BoundedInt, BoundedString, Email
import json

def validate_llm_response(json_str: str) -> dict:
    """Validate JSON from Claude/GPT"""
    data = json.loads(json_str)
    
    # Define expected schema
    validators = {
        "confidence": BoundedInt(0, 100),
        "category": BoundedString(1, 50),
        "email": Email,
    }
    
    result = {}
    errors = []
    
    for field, validator in validators.items():
        try:
            result[field] = validator.validate(data[field])
        except ValidationError as e:
            errors.append(str(e))
    
    if errors:
        raise ValidationError("response", f"LLM output invalid: {errors}")
    
    return result

# Example
llm_output = '{"confidence": 85, "category": "finance", "email": "user@example.com"}'
validated = validate_llm_response(llm_output)
```

### 2. API Response Validation

```python
from dhi import BoundedInt, BoundedString
import requests

class APIValidator:
    status_code = BoundedInt(200, 299)
    user_id = BoundedInt(1, 999999)
    username = BoundedString(3, 20)
    
    @staticmethod
    def validate_response(response: dict):
        """Validate API response structure"""
        return {
            "user_id": APIValidator.user_id.validate(response["user_id"]),
            "username": APIValidator.username.validate(response["username"]),
        }

# Use with external APIs
response = requests.get("https://api.example.com/user/123").json()
validated = APIValidator.validate_response(response)
```

### 3. Structured Output Validation

```python
from dhi import BoundedInt, BoundedString, ValidationError
from typing import List, Dict

def validate_structured_output(data: List[Dict]) -> List[Dict]:
    """Validate batch of AI-generated structured data"""
    
    validators = {
        "score": BoundedInt(0, 100),
        "label": BoundedString(1, 50),
    }
    
    validated = []
    for item in data:
        try:
            validated_item = {
                k: validators[k].validate(item[k])
                for k in validators.keys()
            }
            validated.append(validated_item)
        except ValidationError as e:
            print(f"Skipping invalid item: {e}")
    
    return validated

# Example: Validate AI classification results
ai_results = [
    {"score": 95, "label": "positive"},
    {"score": 42, "label": "neutral"},
    {"score": 150, "label": "invalid"},  # Will be skipped
]

valid_results = validate_structured_output(ai_results)
```

## Integration Patterns

### Pattern 1: Fail-Fast Validation

```python
from dhi import BoundedInt, ValidationError

def process_ai_output(data: dict):
    """Validate and process immediately"""
    age = BoundedInt(0, 150).validate(data["age"])
    # If validation fails, exception is raised
    # Continue processing only with valid data
    return process_valid_age(age)
```

### Pattern 2: Collect All Errors

```python
from dhi import ValidationError

def validate_with_errors(data: dict) -> tuple[dict, list]:
    """Collect all validation errors"""
    result = {}
    errors = []
    
    validators = {
        "age": BoundedInt(18, 120),
        "name": BoundedString(1, 100),
    }
    
    for field, validator in validators.items():
        try:
            result[field] = validator.validate(data[field])
        except ValidationError as e:
            errors.append(e)
    
    return result, errors
```

### Pattern 3: Batch Processing

```python
def validate_batch(items: List[dict]) -> tuple[List[dict], List[dict]]:
    """Separate valid and invalid items"""
    valid = []
    invalid = []
    
    for item in items:
        try:
            validated = validate_item(item)
            valid.append(validated)
        except ValidationError:
            invalid.append(item)
    
    return valid, invalid
```

## Performance Tips for AI Workloads

### 1. Use Batch Validation
```python
# Slow: Validate one at a time
for item in items:
    validate(item)

# Fast: Use batch API (when available)
results = validate_batch(items)
```

### 2. Reuse Validators
```python
# Slow: Create validator each time
for item in items:
    BoundedInt(0, 100).validate(item["score"])

# Fast: Create once, reuse
score_validator = BoundedInt(0, 100)
for item in items:
    score_validator.validate(item["score"])
```

### 3. Pre-validate Schema
```python
# Define schema once
SCHEMA = {
    "age": BoundedInt(18, 120),
    "name": BoundedString(1, 100),
    "email": Email,
}

# Reuse for all validations
def validate(data: dict) -> dict:
    return {k: SCHEMA[k].validate(data[k]) for k in SCHEMA}
```

## AI Agent Integration Examples

### Example 1: Claude Tool Validation

```python
from dhi import BoundedInt, BoundedString, ValidationError

def validate_tool_call(tool_name: str, args: dict) -> dict:
    """Validate Claude tool call arguments"""
    
    schemas = {
        "search": {
            "query": BoundedString(1, 500),
            "limit": BoundedInt(1, 100),
        },
        "calculate": {
            "x": BoundedInt(-1000000, 1000000),
            "y": BoundedInt(-1000000, 1000000),
        },
    }
    
    if tool_name not in schemas:
        raise ValidationError("tool", f"Unknown tool: {tool_name}")
    
    schema = schemas[tool_name]
    validated = {}
    
    for field, validator in schema.items():
        validated[field] = validator.validate(args[field])
    
    return validated
```

### Example 2: Streaming Validation

```python
from dhi import BoundedInt, ValidationError

def validate_stream(stream):
    """Validate streaming AI responses"""
    score_validator = BoundedInt(0, 100)
    
    for chunk in stream:
        try:
            if "score" in chunk:
                chunk["score"] = score_validator.validate(chunk["score"])
            yield chunk
        except ValidationError as e:
            print(f"Invalid chunk: {e}")
            continue
```

## Comparison with Other Tools

| Library | Speed | Use Case |
|---------|-------|----------|
| **dhi** | 18M/sec | General validation, AI outputs |
| **satya** | 7M/sec | Python-first, Rust backend |
| **msgspec** | 20M/sec | JSON-only, no validation rules |
| **Pydantic** | 1M/sec | Full ORM features, slower |

## Why Use dhi for AI Workloads?

1. **Blazing Fast** - 18M validations/sec
2. **Simple API** - Easy to integrate with AI tools
3. **Rich Validation** - Email, patterns, bounds, custom rules
4. **Batch Support** - Validate 1000s of items efficiently
5. **Zero Dependencies** - Pure Python fallback works everywhere
6. **Type Safe** - Catch errors before they propagate

## Installation

```bash
pip install dhi
```

Or with native extension:
```bash
git clone https://github.com/justrach/satya-zig.git
cd satya-zig
zig build -Doptimize=ReleaseFast
cd python-bindings
pip install -e .
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

## License

MIT License - See [LICENSE](LICENSE)
