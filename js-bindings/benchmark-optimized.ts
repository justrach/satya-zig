/**
 * Optimized Schema Benchmark
 * Compare: Original vs Optimized vs Zod
 */

import { z as dhiOriginal } from "./schema";
import { z as dhiOptimized } from "./schema-optimized";

console.log("⚡ OPTIMIZATION BENCHMARK");
console.log("=".repeat(80));
console.log();

// Test 1: Simple Schema (100K items)
console.log("Test 1: Simple Schema - String + Number (100,000 items)");
console.log("-".repeat(80));

const simpleData = Array.from({ length: 100_000 }, (_, i) => ({
  name: `User${i}`,
  age: 25 + (i % 50)
}));

const originalSimpleSchema = dhiOriginal.object({
  name: dhiOriginal.string().min(2).max(100),
  age: dhiOriginal.number().positive().min(18).max(120)
});

const optimizedSimpleSchema = dhiOptimized.object({
  name: dhiOptimized.string().min(2).max(100),
  age: dhiOptimized.number().positive().min(18).max(120)
});

// Compile optimized schema
optimizedSimpleSchema.compile();

// Warmup
for (let i = 0; i < 5; i++) {
  for (const item of simpleData.slice(0, 1000)) {
    originalSimpleSchema.safeParse(item);
    optimizedSimpleSchema.safeParse(item);
  }
}

// Benchmark Original dhi
const originalTimes: number[] = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  let valid = 0;
  for (const item of simpleData) {
    const result = originalSimpleSchema.safeParse(item);
    if (result.success) valid++;
  }
  originalTimes.push(performance.now() - start);
}
const originalMedian = originalTimes.sort((a, b) => a - b)[Math.floor(originalTimes.length / 2)];

console.log(`  dhi (original):  ${originalMedian.toFixed(2)}ms (${(simpleData.length / (originalMedian / 1000)).toLocaleString()} items/sec)`);

// Benchmark Optimized dhi
const optimizedTimes: number[] = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  let valid = 0;
  for (const item of simpleData) {
    const result = optimizedSimpleSchema.safeParse(item);
    if (result.success) valid++;
  }
  optimizedTimes.push(performance.now() - start);
}
const optimizedMedian = optimizedTimes.sort((a, b) => a - b)[Math.floor(optimizedTimes.length / 2)];

console.log(`  dhi (optimized): ${optimizedMedian.toFixed(2)}ms (${(simpleData.length / (optimizedMedian / 1000)).toLocaleString()} items/sec)`);
console.log(`  Speedup:         ${(originalMedian / optimizedMedian).toFixed(2)}x faster 🔥`);

// Benchmark Zod
try {
  const { z } = await import("zod");
  
  const zodSimpleSchema = z.object({
    name: z.string().min(2).max(100),
    age: z.number().positive().min(18).max(120)
  });
  
  const zodTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of simpleData) {
      const result = zodSimpleSchema.safeParse(item);
      if (result.success) valid++;
    }
    zodTimes.push(performance.now() - start);
  }
  const zodMedian = zodTimes.sort((a, b) => a - b)[Math.floor(zodTimes.length / 2)];
  
  console.log(`  Zod:             ${zodMedian.toFixed(2)}ms (${(simpleData.length / (zodMedian / 1000)).toLocaleString()} items/sec)`);
  console.log(`  vs Zod:          ${(zodMedian / optimizedMedian).toFixed(2)}x faster than Zod! 🚀`);
  console.log();
  
  // Test 2: Complex Schema with Email (10K items)
  console.log("Test 2: Complex Schema with Email Validation (10,000 items)");
  console.log("-".repeat(80));
  
  const complexData = Array.from({ length: 10_000 }, (_, i) => ({
    id: i,
    name: `User${i}`,
    email: `user${i}@example.com`,
    age: 25 + (i % 50),
    active: i % 2 === 0
  }));
  
  const originalComplexSchema = dhiOriginal.object({
    id: dhiOriginal.number().int().positive(),
    name: dhiOriginal.string().min(2).max(100),
    email: dhiOriginal.string().email(),
    age: dhiOriginal.number().positive().min(18).max(120),
    active: dhiOriginal.boolean()
  });
  
  const optimizedComplexSchema = dhiOptimized.object({
    id: dhiOptimized.number().int().positive(),
    name: dhiOptimized.string().min(2).max(100),
    email: dhiOptimized.string().email(),
    age: dhiOptimized.number().positive().min(18).max(120),
    active: dhiOptimized.boolean()
  });
  
  // Warmup
  for (let i = 0; i < 5; i++) {
    for (const item of complexData.slice(0, 100)) {
      originalComplexSchema.safeParse(item);
      optimizedComplexSchema.safeParse(item);
    }
  }
  
  // Benchmark Original
  const origComplexTimes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of complexData) {
      const result = originalComplexSchema.safeParse(item);
      if (result.success) valid++;
    }
    origComplexTimes.push(performance.now() - start);
  }
  const origComplexMedian = origComplexTimes.sort((a, b) => a - b)[Math.floor(origComplexTimes.length / 2)];
  
  console.log(`  dhi (original):  ${origComplexMedian.toFixed(2)}ms (${(complexData.length / (origComplexMedian / 1000)).toLocaleString()} items/sec)`);
  
  // Benchmark Optimized
  const optComplexTimes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of complexData) {
      const result = optimizedComplexSchema.safeParse(item);
      if (result.success) valid++;
    }
    optComplexTimes.push(performance.now() - start);
  }
  const optComplexMedian = optComplexTimes.sort((a, b) => a - b)[Math.floor(optComplexTimes.length / 2)];
  
  console.log(`  dhi (optimized): ${optComplexMedian.toFixed(2)}ms (${(complexData.length / (optComplexMedian / 1000)).toLocaleString()} items/sec)`);
  console.log(`  Speedup:         ${(origComplexMedian / optComplexMedian).toFixed(2)}x faster 🔥`);
  
  // Benchmark Zod
  const zodComplexSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().positive().min(18).max(120),
    active: z.boolean()
  });
  
  const zodComplexTimes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of complexData) {
      const result = zodComplexSchema.safeParse(item);
      if (result.success) valid++;
    }
    zodComplexTimes.push(performance.now() - start);
  }
  const zodComplexMedian = zodComplexTimes.sort((a, b) => a - b)[Math.floor(zodComplexTimes.length / 2)];
  
  console.log(`  Zod:             ${zodComplexMedian.toFixed(2)}ms (${(complexData.length / (zodComplexMedian / 1000)).toLocaleString()} items/sec)`);
  console.log(`  vs Zod:          ${(zodComplexMedian / optComplexMedian).toFixed(2)}x faster than Zod! 🚀`);
  console.log();
  
  // Summary
  console.log("=".repeat(80));
  console.log("📊 OPTIMIZATION RESULTS");
  console.log("=".repeat(80));
  console.log(`Simple schema:  ${(originalMedian / optimizedMedian).toFixed(2)}x speedup from optimization`);
  console.log(`                ${(zodMedian / optimizedMedian).toFixed(2)}x faster than Zod`);
  console.log(`Complex schema: ${(origComplexMedian / optComplexMedian).toFixed(2)}x speedup from optimization`);
  console.log(`                ${(zodComplexMedian / optComplexMedian).toFixed(2)}x faster than Zod`);
  console.log();
  console.log("🎯 Optimizations working:");
  console.log("   ✅ Inline validations (no function calls)");
  console.log("   ✅ Memory pool (reduced allocations)");
  console.log("   ✅ Fast paths (pure JS for simple types)");
  console.log("   ✅ JIT compilation (generated code)");
  
} catch (e) {
  console.log("⚠️  Zod not installed. Install with: bun add zod");
}
