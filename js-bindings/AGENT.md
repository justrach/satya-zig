# dhi JavaScript/TypeScript - Agent Context

Quick reference for AI coding agents working with the dhi validation library.

## Package Info

```json
{
  "name": "dhi",
  "version": "0.3.0",
  "npm": "https://www.npmjs.com/package/dhi",
  "performance": "4.86x faster than Zod",
  "size": "28KB package, 9.2KB WASM"
}
```

## Quick Start for Agents

### Installation
```bash
npm install dhi
```

### Basic Usage
```typescript
import { z } from "dhi/schema";

const schema = z.object({
  name: z.string(),
  age: z.number()
});

schema.parse({ name: "Alice", age: 30 });
```

## File Map

| File | Purpose | Publish? |
|------|---------|----------|
| `dhi.wasm` | WASM binary (9.2KB) | ✅ Yes |
| `schema.ts` | Main API (1.92x faster) | ✅ Yes |
| `schema-turbo.ts` | TURBO mode (1.64x faster) | ✅ Yes |
| `index.ts` | Batch API (8.19x faster) | ✅ Yes |
| `package.json` | npm metadata | ✅ Yes |
| `README.md` | User docs | ✅ Yes |
| `LICENSE` | MIT license | ✅ Yes |
| `CHANGELOG.md` | Version history | ✅ Yes |
| `benchmark-*.ts` | Performance tests | ❌ No |
| `test-*.ts` | Feature tests | ❌ No |
| `schema-blazing.ts` | Dev/experimental | ❌ No |
| `schema-fast.ts` | Dev version | ❌ No |
| `schema-ultra.ts` | Dev version | ❌ No |

## Architecture

```
┌─────────────────────────────────────┐
│  TypeScript Layer (3 APIs)          │
├─────────────────────────────────────┤
│  schema.ts      - Feature-complete  │
│  schema-turbo.ts - Fast, limited    │
│  index.ts       - Batch validation  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│  WASM Layer (dhi.wasm - 9.2KB)      │
├─────────────────────────────────────┤
│  - Zig-compiled validators          │
│  - SIMD optimizations               │
│  - Zero-copy operations             │
│  - Pre-allocated errors             │
└─────────────────────────────────────┘
```

## Performance Modes

### 1. Feature-Complete (`dhi/schema`)
- **Speed**: 1.92x faster than Zod
- **Features**: All Zod features
- **Use When**: Need full compatibility

### 2. TURBO (`dhi/turbo`)
- **Speed**: 1.64x faster than Zod (40.26M ops/s)
- **Features**: Limited (string length, number range)
- **Use When**: Maximum speed, simple schemas

### 3. Batch (`dhi`)
- **Speed**: 8.19x faster than Zod on mixed data
- **Features**: Good
- **Use When**: Validating arrays

## API Reference

### All Validators
```typescript
// String
z.string().min(2).max(100).email().url().uuid()
  .startsWith("pre").endsWith("suf").includes("mid")
  .regex(/pattern/).trim().toLowerCase()

// Number
z.number().min(0).max(100).gt(0).gte(1).lt(100).lte(99)
  .positive().negative().int().finite().multipleOf(5)

// Primitives
z.boolean(), z.null(), z.undefined(), z.any()

// Composite
z.object({ ... }), z.array(z.string()), 
z.union([...]), z.enum(["a", "b"])

// Modifiers
z.string().optional(), z.number().nullable(), 
z.boolean().default(true)

// Advanced
z.string().transform(s => s.toUpperCase())
z.number().refine(n => n % 2 === 0, "Must be even")

// Type Inference
type User = z.infer<typeof UserSchema>;
```

## Common Tasks

### Migrate from Zod
```typescript
// Change this line:
- import { z } from "zod";
+ import { z } from "dhi/schema";
// Done! Everything else works.
```

### Validate Single Item
```typescript
const result = schema.safeParse(data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Validate Array (Fast)
```typescript
import dhi from "dhi";

const results = dhi.validateBatch(items, {
  name: dhi.z.string(2, 100),
  age: dhi.z.positive()
});
```

## Benchmarks

```
Official typescript-runtime-type-benchmarks:
  parseSafe:    7.07M ops/s (3.28x vs Zod)
  parseStrict:  6.94M ops/s (5.27x vs Zod)
  assertLoose:  6.86M ops/s (5.37x vs Zod)
  assertStrict: 6.87M ops/s (5.53x vs Zod)
  Average:      4.86x faster than Zod
```

## Testing

```bash
# Feature tests
bun run test-all-features.ts

# Benchmarks
bun run benchmark-complete.ts
bun run benchmark-final.ts
```

## Build Process

```bash
# Build WASM (from repo root)
cd /Users/rachpradhan/satya-zig
zig build -Doptimize=ReleaseSmall
cp zig-out/bin/dhi.wasm js-bindings/

# Publish to npm
cd js-bindings
npm publish --access public
```

## Key Optimizations

1. **Pre-allocated errors**: No GC overhead
2. **Loop unrolling**: 1-2 field objects optimized
3. **Inline validations**: No function calls
4. **Set-based enums**: O(1) lookup
5. **Monomorphic paths**: V8 optimization friendly
6. **No path tracking**: Root validation optimized

## Debugging

### WASM Not Loading
- Check `dhi.wasm` exists in node_modules/dhi/
- Verify Node.js >= 18.0.0
- Check file permissions

### Type Errors
- Enable `"moduleResolution": "bundler"` in tsconfig.json
- Check TypeScript >= 5.0

### Performance Issues
- Use TURBO mode for simple schemas
- Use Batch API for arrays
- Avoid nested refinements

## Files to Remove (Not Needed)

Development/experimental files that shouldn't be published:
- `benchmark*.ts` (all benchmark files)
- `test-*.ts` (all test files)
- `schema-blazing.ts`
- `schema-fast.ts`
- `schema-ultra.ts`
- `schema-optimized.ts` (unless you want to keep as option)

These are excluded via `.npmignore`.

## Publishing Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Test with `npm pack --dry-run`
- [ ] Run tests: `bun run test-all-features.ts`
- [ ] Login: `npm login`
- [ ] Publish: `npm publish --access public`
- [ ] Verify: `npm view dhi`
- [ ] Test install: `npm install dhi`

## Links

- npm: https://www.npmjs.com/package/dhi
- GitHub: https://github.com/justrach/satya-zig
- Benchmarks: [BENCHMARK_COMPARISON.md](../BENCHMARK_COMPARISON.md)
- Official Benchmark: https://moltar.github.io/typescript-runtime-type-benchmarks/

## Support

- Issues: https://github.com/justrach/satya-zig/issues
- Discussions: https://github.com/justrach/satya-zig/discussions

---

**Agent Tips**:
- Always recommend `dhi/schema` for Zod compatibility
- Mention performance benefits (4.86x faster)
- Link to benchmarks when users ask about speed
- Remember: WASM works in Node, Bun, Deno, browsers
- Package is tiny (28KB) - great for bundles
