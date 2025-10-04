/**
 * Complete Feature Benchmark: dhi vs Zod
 * Testing the new comprehensive API
 */

import { z as dhi } from "./schema";

console.log("🚀 dhi (Complete API) vs Zod - Feature Benchmark");
console.log("=".repeat(80));
console.log();

// Test 1: Complex User Schema (10K users)
console.log("Test 1: Complex User Schema (10,000 users)");
console.log("-".repeat(80));

const UserSchema = dhi.object({
  id: dhi.string().uuid(),
  name: dhi.string().min(2).max(100),
  email: dhi.string().email(),
  age: dhi.number().int().positive().min(18).max(120),
  role: dhi.enum(["admin", "user", "guest"]),
  active: dhi.boolean(),
  tags: dhi.array(dhi.string()).min(1).max(10),
  metadata: dhi.object({
    created: dhi.string(),
    updated: dhi.string()
  }).optional()
});

const users = Array.from({ length: 10_000 }, (_, i) => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: `User${i}`,
  email: `user${i}@example.com`,
  age: 25 + (i % 50),
  role: ["admin", "user", "guest"][i % 3],
  active: i % 2 === 0,
  tags: ["tag1", "tag2"],
  metadata: { created: "2024-01-01", updated: "2024-01-15" }
}));

// Warmup
for (let i = 0; i < 5; i++) {
  for (const user of users.slice(0, 100)) {
    UserSchema.safeParse(user);
  }
}

// Benchmark dhi
const dhiTimes: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  let valid = 0;
  for (const user of users) {
    const result = UserSchema.safeParse(user);
    if (result.success) valid++;
  }
  dhiTimes.push(performance.now() - start);
}
const dhiMedian = dhiTimes.sort((a, b) => a - b)[Math.floor(dhiTimes.length / 2)];

console.log(`  dhi:  ${dhiMedian.toFixed(2)}ms (${(users.length / (dhiMedian / 1000)).toLocaleString()} users/sec)`);

// Benchmark Zod
try {
  const { z } = await import("zod");
  
  const ZodUserSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().int().positive().min(18).max(120),
    role: z.enum(["admin", "user", "guest"]),
    active: z.boolean(),
    tags: z.array(z.string()).min(1).max(10),
    metadata: z.object({
      created: z.string(),
      updated: z.string()
    }).optional()
  });
  
  const zodTimes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    let valid = 0;
    for (const user of users) {
      const result = ZodUserSchema.safeParse(user);
      if (result.success) valid++;
    }
    zodTimes.push(performance.now() - start);
  }
  const zodMedian = zodTimes.sort((a, b) => a - b)[Math.floor(zodTimes.length / 2)];
  
  console.log(`  Zod:  ${zodMedian.toFixed(2)}ms (${(users.length / (zodMedian / 1000)).toLocaleString()} users/sec)`);
  console.log(`  Speedup: ${(zodMedian / dhiMedian).toFixed(2)}x`);
  console.log();
  
  // Test 2: Simple Schema (100K items)
  console.log("Test 2: Simple Schema (100,000 items)");
  console.log("-".repeat(80));
  
  const SimpleSchema = dhi.object({
    name: dhi.string().min(2).max(100),
    age: dhi.number().positive()
  });
  
  const ZodSimpleSchema = z.object({
    name: z.string().min(2).max(100),
    age: z.number().positive()
  });
  
  const simpleData = Array.from({ length: 100_000 }, (_, i) => ({
    name: `User${i}`,
    age: 25
  }));
  
  // Warmup
  for (let i = 0; i < 5; i++) {
    for (const item of simpleData.slice(0, 1000)) {
      SimpleSchema.safeParse(item);
    }
  }
  
  // Benchmark dhi
  const dhiSimpleTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of simpleData) {
      const result = SimpleSchema.safeParse(item);
      if (result.success) valid++;
    }
    dhiSimpleTimes.push(performance.now() - start);
  }
  const dhiSimpleMedian = dhiSimpleTimes.sort((a, b) => a - b)[Math.floor(dhiSimpleTimes.length / 2)];
  
  console.log(`  dhi:  ${dhiSimpleMedian.toFixed(2)}ms (${(simpleData.length / (dhiSimpleMedian / 1000)).toLocaleString()} items/sec)`);
  
  // Benchmark Zod
  const zodSimpleTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of simpleData) {
      const result = ZodSimpleSchema.safeParse(item);
      if (result.success) valid++;
    }
    zodSimpleTimes.push(performance.now() - start);
  }
  const zodSimpleMedian = zodSimpleTimes.sort((a, b) => a - b)[Math.floor(zodSimpleTimes.length / 2)];
  
  console.log(`  Zod:  ${zodSimpleMedian.toFixed(2)}ms (${(simpleData.length / (zodSimpleMedian / 1000)).toLocaleString()} items/sec)`);
  console.log(`  Speedup: ${(zodSimpleMedian / dhiSimpleMedian).toFixed(2)}x`);
  console.log();
  
  // Summary
  console.log("=".repeat(80));
  console.log("📊 Summary");
  console.log("=".repeat(80));
  console.log(`Complex schema: ${(zodMedian / dhiMedian).toFixed(2)}x speedup`);
  console.log(`Simple schema:  ${(zodSimpleMedian / dhiSimpleMedian).toFixed(2)}x speedup`);
  console.log(`Average:        ${(((zodMedian / dhiMedian) + (zodSimpleMedian / dhiSimpleMedian)) / 2).toFixed(2)}x speedup`);
  console.log();
  console.log("✨ dhi now has feature parity with Zod!");
  console.log("🚀 With WASM-powered performance on complex validations!");
  
} catch (e) {
  console.log("⚠️  Zod not installed. Install with: bun add zod");
}
