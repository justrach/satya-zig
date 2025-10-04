# dhi - Ultra-Fast Validation for JavaScript/TypeScript

**Faster than Zod.** Powered by Zig + WebAssembly.

## 🚀 Performance

**1.16x faster than Zod v4** with only **4KB** WASM module!

```
Benchmark: 10,000 users with 4 validators each

dhi (Zig + WASM):  1,246,378 users/sec
Zod v4:            1,071,510 users/sec

dhi is 1.16x faster! 🔥
```

## ✨ Features

- **🏆 Faster than Zod** - 1.16x speedup
- **📦 Tiny** - Only 4KB WASM module
- **🌍 Universal** - Works in Node.js, Bun, Deno, and browsers
- **⚡ Zero overhead** - Direct WASM calls, no FFI
- **🎯 Type-safe** - Full TypeScript support
- **🔋 24+ Validators** - Email, URL, UUID, dates, numbers, strings

## 📦 Installation

```bash
npm install dhi
# or
bun add dhi
# or
yarn add dhi
```

## 🎯 Quick Start

```typescript
import dhi from "dhi";

// Define schema
const userSchema = {
  name: dhi.z.string(2, 100),
  email: dhi.z.email(),
  age: dhi.z.positive(),
  website: dhi.z.url(),
};

// Validate single item
const result = dhi.validate(
  {
    name: "Alice",
    email: "alice@example.com",
    age: 25,
    website: "https://alice.com",
  },
  userSchema
);

console.log(result.valid); // true

// Validate batch
const users = [
  /* ... */
];
const results = dhi.validateBatch(users, userSchema);
```

## 📚 Available Validators

### String Validators

- `z.email()` - Email validation
- `z.url()` - HTTP/HTTPS URLs
- `z.uuid()` - UUID v4 format
- `z.ipv4()` - IPv4 addresses
- `z.isoDate()` - ISO 8601 date (YYYY-MM-DD)
- `z.isoDatetime()` - ISO 8601 datetime
- `z.base64()` - Base64 encoding
- `z.string(min, max)` - String length

### Number Validators

- `z.number(min, max)` - Integer range
- `z.positive()` - Positive numbers (> 0)
- `z.nonNegative()` - Non-negative (>= 0)

## 🔬 Why So Fast?

1. **Pure Zig validators** - Compiled to optimized WASM
2. **Zero overhead** - Direct WASM calls, no FFI
3. **Tiny binary** - Only 4KB, loads instantly
4. **No runtime** - No JavaScript validation logic

## 📊 Benchmarks

```bash
bun run benchmark.ts
```

## 🌍 Platform Support

- ✅ Node.js 16+
- ✅ Bun 1.0+
- ✅ Deno 1.0+
- ✅ Browsers (Chrome, Firefox, Safari, Edge)

## 📖 Examples

### Email Validation

```typescript
import { validators } from "dhi";

console.log(validators.email("user@example.com")); // true
console.log(validators.email("not-an-email")); // false
```

### Number Validation

```typescript
console.log(validators.positive(25)); // true
console.log(validators.positive(-5)); // false
console.log(validators.int(50, 0, 100)); // true
```

### Batch Validation

```typescript
const users = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 },
];

const schema = {
  name: dhi.z.string(2, 50),
  age: dhi.z.positive(),
};

const results = dhi.validateBatch(users, schema);
console.log(results); // [{ valid: true }, { valid: true }]
```

## 🔗 Links

- **GitHub**: https://github.com/justrach/satya-zig
- **Python version**: https://pypi.org/project/dhi/ (27M validations/sec!)

## 📄 License

MIT

---

**Built with ❤️ and Zig for the JavaScript community**

**Performance**: 1.16x faster than Zod | **Size**: 4KB | **Status**: Production Ready 🚀
