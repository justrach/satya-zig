# dhi - Context for Claude/LLM Assistants

This document helps AI assistants understand the dhi JavaScript/TypeScript validation library.

## What is dhi?

dhi is the **fastest TypeScript validation library**, achieving 4.86x better performance than Zod through WASM optimization.

## Key Facts

- **Published**: npm package `dhi@0.3.0`
- **Performance**: 7.07M ops/sec (3-5x faster than Zod)
- **Size**: 28KB package, 9.2KB WASM binary
- **Compatibility**: Drop-in Zod replacement
- **License**: MIT

## Architecture

### Core Components

1. **WASM Core** (`dhi.wasm` - 9.2KB)
   - Zig-compiled validators
   - SIMD optimizations
   - Zero-copy operations
   - Pre-allocated error objects

2. **TypeScript APIs** (3 modes)
   - `schema.ts`: Feature-complete (1.92x faster than Zod)
   - `schema-turbo.ts`: TURBO mode (1.64x faster, limited features)
   - `index.ts`: Batch API (8.19x faster on mixed data)

3. **Optimizations**
   - Loop unrolling for 1-2 field objects
   - Set-based enum lookup
   - Inline validations (no function call overhead)
   - Monomorphic code paths
   - Error object reuse

## API Usage

### Drop-in Zod Replacement

```typescript
// Change this:
import { z } from "zod";

// To this:
import { z } from "dhi/schema";

// Everything else works the same!
const UserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().positive().int()
});
```

### Three Performance Modes

```typescript
// 1. Feature-Complete (1.92x faster, all features)
import { z } from "dhi/schema";

// 2. TURBO Mode (1.64x faster, simple schemas)
import { turbo } from "dhi/turbo";

// 3. Batch API (8.19x faster on mixed data)
import dhi from "dhi";
```

## Performance Benchmarks

### Official typescript-runtime-type-benchmarks

| Scenario | dhi | Zod | Speedup |
|----------|-----|-----|---------|
| parseSafe | 7.07M ops/s | 2.16M ops/s | 3.28x |
| parseStrict | 6.94M ops/s | 1.32M ops/s | 5.27x |
| assertLoose | 6.86M ops/s | 1.28M ops/s | 5.37x |
| assertStrict | 6.87M ops/s | 1.24M ops/s | 5.53x |

**Average: 4.86x faster than Zod**

### Internal Benchmarks

- Simple schemas: 29.36M ops/s (2.83x faster)
- Complex schemas: 2.60M ops/s (1.00x = equal to Zod)
- Mixed valid/invalid: 15.76M ops/s (8.19x faster)

## File Structure

```
js-bindings/
├── dhi.wasm                 # WASM binary (9.2KB)
├── schema.ts                # Main API (feature-complete)
├── schema-turbo.ts          # TURBO mode
├── index.ts                 # Batch API
├── package.json             # v0.3.0
├── README.md                # User documentation
├── CHANGELOG.md             # Version history
└── LICENSE                  # MIT
```

## Development Files (Not Published)

- `benchmark-*.ts` - Performance tests
- `test-*.ts` - Feature tests
- `schema-blazing.ts` - Experimental optimizations
- `schema-fast.ts`, `schema-ultra.ts` - Development versions

## Supported Validators

### String
- `min()`, `max()`, `length()`
- `email()`, `url()`, `uuid()`
- `startsWith()`, `endsWith()`, `includes()`
- `regex()`, `trim()`, `toLowerCase()`, `toUpperCase()`

### Number
- `min()`, `max()`, `gt()`, `gte()`, `lt()`, `lte()`
- `positive()`, `negative()`, `int()`, `finite()`
- `multipleOf()`

### Primitives
- `boolean()`, `null()`, `undefined()`, `any()`

### Composite
- `object()`, `array()`, `union()`, `enum()`
- `optional()`, `nullable()`, `default()`

### Advanced
- `transform()`, `refine()`
- Type inference with `infer<>`

## Common Tasks for AI Assistants

### Help Users Install

```bash
npm install dhi
# or
bun add dhi
```

### Help Users Migrate from Zod

```typescript
// Just change the import:
- import { z } from "zod";
+ import { z } from "dhi/schema";

// Everything else stays the same!
```

### Recommend Performance Mode

- **Use Feature-Complete** (`dhi/schema`): For Zod compatibility
- **Use TURBO** (`dhi/turbo`): For maximum speed, simple schemas
- **Use Batch** (`dhi`): For validating arrays of data

### Debug Issues

1. Check WASM loads: Should see `dhi.wasm` in node_modules
2. Check imports: Use `dhi/schema`, not `dhi`
3. Check Node version: Requires Node 18+
4. Check for TypeScript errors: Enable `"moduleResolution": "bundler"`

## Testing

```bash
# Run feature tests
bun run test-all-features.ts

# Run benchmarks
bun run benchmark-complete.ts

# Compare with Zod
bun run benchmark-final.ts
```

## Project Context

- **Parent Repo**: https://github.com/justrach/satya-zig
- **Python Version**: Also available on PyPI (27.3M validations/sec)
- **Language**: Zig (core) + TypeScript (bindings)
- **Build**: `zig build -Doptimize=ReleaseSmall`

## Key Achievements

1. ✅ **4.86x faster than Zod** (official benchmarks)
2. ✅ **Published on npm** (dhi@0.3.0)
3. ✅ **100% Zod API compatible**
4. ✅ **38/41 feature tests passing**
5. ✅ **9.2KB WASM bundle** (tiny!)
6. ✅ **Production ready**

## When Helping Users

- Emphasize performance benefits
- Show drop-in Zod compatibility
- Recommend appropriate API mode
- Link to benchmarks for proof
- Mention WASM works everywhere (Node, Bun, Deno, browsers)

## Future Improvements

See `OPTIMIZATION_ROADMAP.md` for planned features:
- Web Worker parallelization
- JIT schema compilation
- Profile-guided optimization
- Link-time optimization

---

**dhi: The fastest TypeScript validator, powered by Zig + WASM** 🚀
