# Contributing to satya-zig

Thanks for your interest in contributing! This document provides guidelines and information for contributors.

## Development Setup

1. **Install Zig** (0.13.0 or later)
   ```bash
   # Download from https://ziglang.org/download/
   ```

2. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/satya-zig.git
   cd satya-zig
   ```

3. **Run tests**
   ```bash
   zig build test
   ```

4. **Run examples**
   ```bash
   zig build run-all
   ```

## Project Structure

```
satya-zig/
├── src/
│   ├── validator.zig        # Core validation primitives
│   ├── combinators.zig      # Combinator patterns (Optional, OneOf, etc.)
│   ├── json_validator.zig   # JSON integration
│   └── root.zig             # Public API exports
├── examples/
│   ├── basic_usage.zig      # Basic validation examples
│   ├── json_example.zig     # JSON validation examples
│   └── advanced_example.zig # Complex validation scenarios
├── build.zig                # Build configuration
└── SATYA_PATTERNS.md        # Design patterns from Satya
```

## Code Style

- Follow Zig's standard formatting (`zig fmt`)
- Use meaningful variable names
- Add doc comments for public APIs
- Keep functions focused and small
- Prefer compile-time validation where possible

## Adding New Validators

1. **Add to `src/validator.zig`** for core primitives
2. **Add to `src/combinators.zig`** for composable patterns
3. **Include tests** in the same file
4. **Update README.md** with usage examples
5. **Add example** to `examples/` if complex

Example validator structure:

```zig
/// MyValidator validates X with constraints Y.
/// Inspired by satya's Field(constraint=value) pattern.
pub const MyValidator = struct {
    const Self = @This();
    value: T,

    pub fn init(v: T) !Self {
        // Validation logic
        if (!isValid(v)) return error.Invalid;
        return .{ .value = v };
    }

    pub fn validate(v: T, errors: *ValidationErrors, field_name: []const u8) !T {
        // Validation with error collection
        if (!isValid(v)) {
            try errors.add(field_name, "Validation failed");
            return error.ValidationFailed;
        }
        return v;
    }
};

test "MyValidator - valid case" {
    const val = try MyValidator.init(valid_input);
    try std.testing.expectEqual(expected, val.value);
}

test "MyValidator - invalid case" {
    const result = MyValidator.init(invalid_input);
    try std.testing.expectError(error.Invalid, result);
}
```

## Testing Guidelines

- Write tests for both success and failure cases
- Test edge cases (empty, null, boundary values)
- Use descriptive test names
- Keep tests focused on one behavior

```zig
test "BoundedInt - within range" { ... }
test "BoundedInt - below minimum" { ... }
test "BoundedInt - above maximum" { ... }
test "BoundedInt - at boundaries" { ... }
```

## Documentation

- Add doc comments (`///`) for all public APIs
- Include usage examples in doc comments
- Reference Satya patterns where applicable
- Update README.md for new features

```zig
/// BoundedInt creates a validated integer type with compile-time bounds.
/// Inspired by satya's Field(ge=min, le=max) pattern.
///
/// Example:
///   const Age = BoundedInt(u8, 0, 130);
///   const age = try Age.init(27);  // OK
///   const bad = try Age.init(200); // error.OutOfRange
pub fn BoundedInt(comptime T: type, comptime min: T, comptime max: T) type {
    ...
}
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-validator
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Run tests and formatting**
   ```bash
   zig fmt .
   zig build test
   zig build run-all
   ```

4. **Commit with clear messages**
   ```bash
   git commit -m "Add URL validator with RFC 3986 compliance"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/my-new-validator
   ```

6. **PR checklist**
   - [ ] Tests pass
   - [ ] Code formatted with `zig fmt`
   - [ ] Documentation updated
   - [ ] Examples added if needed
   - [ ] No breaking changes (or clearly documented)

## Areas for Contribution

### High Priority
- [ ] Full regex support (replace Pattern placeholder)
- [ ] URL validator (RFC 3986)
- [ ] UUID validator
- [ ] DateTime validation
- [ ] Custom error messages per validator

### Medium Priority
- [ ] Performance benchmarks
- [ ] Async validation support
- [ ] More JSON schema features
- [ ] Nested struct validation improvements
- [ ] Better error path tracking

### Nice to Have
- [ ] Custom validator macros
- [ ] Integration with other JSON libraries
- [ ] YAML validation support
- [ ] More examples (REST API, CLI, etc.)
- [ ] Fuzzing tests

## Design Philosophy

When contributing, keep these principles in mind:

1. **Declarative over Imperative**
   - Prefer type-level constraints over runtime checks
   - Use comptime where possible

2. **Collect All Errors**
   - Don't fail fast
   - Report all validation errors at once

3. **Zero-Cost Abstractions**
   - No allocations in success path
   - Inline hot paths
   - Use comptime for type derivation

4. **Ergonomic APIs**
   - Clear error messages
   - Intuitive naming
   - Composable validators

5. **Satya-Inspired**
   - Follow patterns from Satya/Pydantic/Zod
   - Maintain compatibility with common validation patterns

## Questions?

- Open an issue for discussion
- Check existing issues and PRs
- Reference SATYA_PATTERNS.md for design context

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
