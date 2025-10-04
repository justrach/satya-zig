/**
 * Comprehensive Benchmark: dhi vs Zod
 * Testing various scenarios with mixed datasets
 */

import dhi from "./index";

console.log("🚀 DHI vs Zod - Comprehensive Benchmark");
console.log("=".repeat(80));
console.log();

// Test 1: Simple 4-Field Required Schema (100K items)
console.log("Test 1: Simple 4-Field Required Schema (100,000 items)");
console.log("-".repeat(80));

const simpleData = Array.from({ length: 100_000 }, (_, i) => ({
  name: `User${i}`,
  email: `user${i}@example.com`,
  age: 25,
  active: true,
}));

const simpleSchema = {
  name: dhi.z.string(2, 100),
  email: dhi.z.email(),
  age: dhi.z.positive(),
};

// Warmup
for (let i = 0; i < 3; i++) {
  dhi.validateBatch(simpleData.slice(0, 10000), simpleSchema);
}

// Benchmark DHI
const dhiSimpleTimes: number[] = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  dhi.validateBatch(simpleData, simpleSchema);
  dhiSimpleTimes.push(performance.now() - start);
}
const dhiSimpleMedian = dhiSimpleTimes.sort((a, b) => a - b)[Math.floor(dhiSimpleTimes.length / 2)];
const dhiSimpleOps = (simpleData.length * 3) / (dhiSimpleMedian / 1000);

console.log(`  DHI:  ${dhiSimpleMedian.toFixed(2)}ms (${(dhiSimpleOps / 1_000_000).toFixed(2)}M ops/sec)`);

// Benchmark Zod
try {
  const { z } = await import("zod");
  
  const zodSimpleSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().positive(),
  });
  
  const zodSimpleTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of simpleData) {
      const result = zodSimpleSchema.safeParse(item);
      if (result.success) valid++;
    }
    zodSimpleTimes.push(performance.now() - start);
  }
  const zodSimpleMedian = zodSimpleTimes.sort((a, b) => a - b)[Math.floor(zodSimpleTimes.length / 2)];
  const zodSimpleOps = (simpleData.length * 3) / (zodSimpleMedian / 1000);
  
  console.log(`  Zod:  ${zodSimpleMedian.toFixed(2)}ms (${(zodSimpleOps / 1_000_000).toFixed(2)}M ops/sec)`);
  console.log(`  Speedup: ${(zodSimpleMedian / dhiSimpleMedian).toFixed(2)}x`);
  console.log();
  
  // Test 2: Mixed Valid/Invalid Data (50K items)
  console.log("Test 2: Mixed Valid/Invalid Data (50,000 items)");
  console.log("-".repeat(80));
  
  const mixedData = Array.from({ length: 50_000 }, (_, i) => ({
    name: i % 3 === 0 ? "X" : `User${i}`, // 33% invalid (too short)
    email: i % 5 === 0 ? "invalid" : `user${i}@example.com`, // 20% invalid
    age: i % 7 === 0 ? -5 : 25, // 14% invalid (negative)
  }));
  
  // Warmup
  for (let i = 0; i < 3; i++) {
    dhi.validateBatch(mixedData.slice(0, 10000), simpleSchema);
  }
  
  // Benchmark DHI
  const dhiMixedTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    dhi.validateBatch(mixedData, simpleSchema);
    dhiMixedTimes.push(performance.now() - start);
  }
  const dhiMixedMedian = dhiMixedTimes.sort((a, b) => a - b)[Math.floor(dhiMixedTimes.length / 2)];
  const dhiMixedOps = (mixedData.length * 3) / (dhiMixedMedian / 1000);
  
  console.log(`  DHI:  ${dhiMixedMedian.toFixed(2)}ms (${(dhiMixedOps / 1_000_000).toFixed(2)}M ops/sec)`);
  
  // Benchmark Zod
  const zodMixedTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of mixedData) {
      const result = zodSimpleSchema.safeParse(item);
      if (result.success) valid++;
    }
    zodMixedTimes.push(performance.now() - start);
  }
  const zodMixedMedian = zodMixedTimes.sort((a, b) => a - b)[Math.floor(zodMixedTimes.length / 2)];
  const zodMixedOps = (mixedData.length * 3) / (zodMixedMedian / 1000);
  
  console.log(`  Zod:  ${zodMixedMedian.toFixed(2)}ms (${(zodMixedOps / 1_000_000).toFixed(2)}M ops/sec)`);
  console.log(`  Speedup: ${(zodMixedMedian / dhiMixedMedian).toFixed(2)}x`);
  console.log();
  
  // Test 3: Complex Nested Schema (10K items)
  console.log("Test 3: Complex Nested Schema (10,000 items)");
  console.log("-".repeat(80));
  
  const complexData = Array.from({ length: 10_000 }, (_, i) => ({
    id: `id-${i}`,
    user: {
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: 25,
    },
    metadata: {
      created: "2024-01-15",
      updated: "2024-01-15",
    },
  }));
  
  const complexSchema = {
    id: dhi.z.string(3, 50),
    user: {
      name: dhi.z.string(2, 100),
      email: dhi.z.email(),
      age: dhi.z.positive(),
    },
    metadata: {
      created: dhi.z.isoDate(),
      updated: dhi.z.isoDate(),
    },
  };
  
  // Note: DHI doesn't support nested schemas yet, so we'll flatten
  const flatComplexData = complexData.map(item => ({
    id: item.id,
    name: item.user.name,
    email: item.user.email,
    age: item.user.age,
    created: item.metadata.created,
    updated: item.metadata.updated,
  }));
  
  const flatComplexSchema = {
    id: dhi.z.string(3, 50),
    name: dhi.z.string(2, 100),
    email: dhi.z.email(),
    age: dhi.z.positive(),
    created: dhi.z.isoDate(),
    updated: dhi.z.isoDate(),
  };
  
  // Warmup
  for (let i = 0; i < 3; i++) {
    dhi.validateBatch(flatComplexData.slice(0, 10000), flatComplexSchema);
  }
  
  // Benchmark DHI
  const dhiComplexTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    dhi.validateBatch(flatComplexData, flatComplexSchema);
    dhiComplexTimes.push(performance.now() - start);
  }
  const dhiComplexMedian = dhiComplexTimes.sort((a, b) => a - b)[Math.floor(dhiComplexTimes.length / 2)];
  const dhiComplexOps = (flatComplexData.length * 6) / (dhiComplexMedian / 1000);
  
  console.log(`  DHI:  ${dhiComplexMedian.toFixed(2)}ms (${(dhiComplexOps / 1_000_000).toFixed(2)}M ops/sec)`);
  
  // Benchmark Zod
  const zodComplexSchema = z.object({
    id: z.string().min(3).max(50),
    user: z.object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      age: z.number().positive(),
    }),
    metadata: z.object({
      created: z.string(),
      updated: z.string(),
    }),
  });
  
  const zodComplexTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of complexData) {
      const result = zodComplexSchema.safeParse(item);
      if (result.success) valid++;
    }
    zodComplexTimes.push(performance.now() - start);
  }
  const zodComplexMedian = zodComplexTimes.sort((a, b) => a - b)[Math.floor(zodComplexTimes.length / 2)];
  const zodComplexOps = (complexData.length * 6) / (zodComplexMedian / 1000);
  
  console.log(`  Zod:  ${zodComplexMedian.toFixed(2)}ms (${(zodComplexOps / 1_000_000).toFixed(2)}M ops/sec)`);
  console.log(`  Speedup: ${(zodComplexMedian / dhiComplexMedian).toFixed(2)}x`);
  console.log();
  
  // Summary
  console.log("=".repeat(80));
  console.log("📊 Summary");
  console.log("=".repeat(80));
  const avgSpeedup = ((zodSimpleMedian / dhiSimpleMedian) + (zodMixedMedian / dhiMixedMedian) + (zodComplexMedian / dhiComplexMedian)) / 3;
  console.log(`Average speedup: ${avgSpeedup.toFixed(2)}x`);
  console.log();
  console.log("Benchmarks run on Mac Studio with Bun runtime");
  
} catch (e) {
  console.log("⚠️  Zod not installed. Install with: bun add zod");
}
