# dhi - Ultra-Fast Validation for JavaScript/TypeScript

**1.64x faster than Zod** with **40.26M ops/sec** in TURBO mode! 🚀

Drop-in replacement for Zod with WASM-powered performance.

## Quick Start

```bash
npm install dhi
# or
bun add dhi
```

### Basic Usage (Drop-in Zod Replacement)

```typescript
import { z } from "dhi/schema";

// Works exactly like Zod!
const UserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().positive().int(),
  role: z.enum(["admin", "user", "guest"]),
  tags: z.array(z.string()).optional()
});

// Validate single item
const user = UserSchema.parse({ name: "Alice", email: "alice@example.com", age: 30, role: "user" });

// Safe validation
const result = UserSchema.safeParse(data);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error);
}
```

### TURBO Mode (Maximum Performance)

For simple schemas with string length and number range validations:

```typescript
import { turbo } from "dhi/turbo";

// 40.26M ops/sec!
const schema = turbo.object({
  name: turbo.string(2, 100),
  age: turbo.number(18, 120)
});

// Validate thousands at once
const users = [/* ... 100K users ... */];
const results = schema.validateMany(users);
```

### Batch API (8.19x faster on mixed data)

```typescript
import dhi from "dhi";

const schema = {
  name: dhi.z.string(2, 100),
  email: dhi.z.email(),
  age: dhi.z.positive()
};

// Blazing fast on mixed valid/invalid data
const results = dhi.validateBatch(users, schema);
```

## Performance

| Mode | ops/sec | vs Zod | Best For |
|------|---------|--------|----------|
| **TURBO** | **40.26M** | **1.64x faster** 🥇 | Simple schemas, maximum speed |
| **Batch (mixed data)** | 15.76M | **8.19x faster** 🔥 | Real-world data with errors |
| **Feature-complete** | 7.14M | 0.66x | Full Zod compatibility |

## Features

### All Zod Features ✅

#### String Validators
- `min()`, `max()`, `length()` - Length constraints
- `email()`, `url()`, `uuid()` - Format validation
- `startsWith()`, `endsWith()`, `includes()` - String checks
- `regex()` - Custom patterns
- `trim()`, `lowercase()`, `uppercase()` - Transformations

#### Number Validators
- `min()`, `max()` - Range
- `gt()`, `gte()`, `lt()`, `lte()` - Comparisons  
- `positive()`, `negative()`, `nonnegative()` - Sign checks
- `int()`, `finite()` - Type constraints
- `multipleOf()` - Divisibility

#### Composite Types
- `object()` - Object schemas
- `array()` - Array validation
- `union()` - Multiple types
- `enum()` - Enumerations
- `optional()`, `nullable()` - Modifiers

#### Advanced
- `.transform()` - Data transformation
- `.refine()` - Custom validation
- `.default()` - Default values
- Type inference with `z.infer<>`

## API Comparison

### dhi (Drop-in Replacement)

```typescript
import { z } from "dhi/schema";

// Works exactly like Zod!
const schema = z.object({
  name: z.string().email(),
  age: z.number().positive()
});
```

### Zod

```typescript
import { z } from "zod";

const schema = z.object({
  name: z.string().email(),
  age: z.number().positive()
});
```

**Yes, it's that simple!** Just change the import and you're done!

## Migration from Zod

### Option 1: Alias (Quickest)

```typescript
// Old: import { z } from "zod";
import { z } from "dhi/schema";

// Everything else stays the same!
```

### Option 2: Gradual Migration

```typescript
// Keep using Zod where needed
import { z as zodz } from "zod";

// Use dhi for performance-critical paths
import { z } from "dhi/schema";
import { turbo } from "dhi/turbo";
```

## When to Use Each API

### Use TURBO Mode When:
- ✅ Simple schemas (string length, number range)
- ✅ Validating thousands of items
- ✅ Maximum performance needed
- ✅ Production workloads

### Use Batch API When:
- ✅ Mix of valid and invalid data
- ✅ Need early-exit optimization
- ✅ Real-world scenarios

### Use Feature-Complete API When:
- ✅ Need full Zod compatibility
- ✅ Complex schemas with email, URL, UUID
- ✅ Transformations and refinements
- ✅ Detailed error messages

## Real-World Example

```typescript
import { z } from "dhi/schema";

// Financial data validation
const TradeSchema = z.object({
  tradeId: z.string().min(10).max(50),
  cusip: z.string().length(9),
  quantity: z.number().positive().int(),
  price: z.number().positive(),
  settlementDate: z.string(),
  counterparty: z.string().min(5)
});

// Validate 100K trades
const trades = [/* ... */];
const results = trades.map(t => TradeSchema.safeParse(t));

// Or use batch mode for even more speed
import dhi from "dhi";
const batchResults = dhi.validateBatch(trades, {
  tradeId: dhi.z.string(10, 50),
  cusip: dhi.z.string(9, 9),
  quantity: dhi.z.positive(),
  price: dhi.z.positive(),
  settlementDate: dhi.z.isoDate(),
  counterparty: dhi.z.string(5, 100)
});
```

## Bundle Size

- WASM module: **9.2KB** (smaller than most validators!)
- Tree-shakeable
- Zero dependencies (WASM is included)

## Browser Support

Works everywhere that supports WASM:
- ✅ Chrome/Edge 57+
- ✅ Firefox 52+
- ✅ Safari 11+
- ✅ Node.js 18+
- ✅ Deno
- ✅ Bun

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import { z, infer as zodInfer } from "dhi/schema";

const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

type User = zodInfer<typeof UserSchema>;
// { name: string; age: number }
```

## Benchmarks

Run benchmarks yourself:

```bash
git clone https://github.com/justrach/satya-zig.git
cd satya-zig/js-bindings
bun install
bun run benchmark-final.ts
```

## Why dhi?

1. **🚀 Blazing Fast**: 1.64x-8.19x faster than Zod
2. **✅ Zod Compatible**: Drop-in replacement
3. **🎯 Three APIs**: Choose speed vs features
4. **📦 Tiny**: 9.2KB WASM
5. **🌍 Universal**: Works everywhere
6. **🔒 Type-Safe**: Full TypeScript support

## License

MIT

## Links

- [GitHub](https://github.com/justrach/satya-zig)
- [npm](https://www.npmjs.com/package/dhi)
- [PyPI (Python)](https://pypi.org/project/dhi/)

---

**Made with Zig + WASM** | **धी** means wisdom/intellect in Sanskrit 🧠
