/**
 * TURBO API Benchmark - Zero-Copy Batch Validation
 */

import { turbo } from "./schema-turbo";

console.log("⚡⚡⚡ TURBO MODE BENCHMARK ⚡⚡⚡");
console.log("=".repeat(80));
console.log();

// Test: Simple Schema (100K items)
console.log("Test: Simple Schema - ZERO ENCODING OVERHEAD (100,000 items)");
console.log("-".repeat(80));

const data = Array.from({ length: 100_000 }, (_, i) => ({
  name: `User${i}`,
  age: 25 + (i % 50)
}));

const turboSchema = turbo.object({
  name: turbo.string(2, 100),
  age: turbo.number(18, 120)
});

// Warmup
for (let i = 0; i < 10; i++) {
  turboSchema.validateMany(data.slice(0, 1000));
}

// Benchmark TURBO
const turboTimes: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  const results = turboSchema.validateMany(data);
  const valid = results.filter(v => v).length;
  turboTimes.push(performance.now() - start);
}
const turboMedian = turboTimes.sort((a, b) => a - b)[Math.floor(turboTimes.length / 2)];

console.log(`  TURBO: ${turboMedian.toFixed(2)}ms (${(data.length / (turboMedian / 1000)).toLocaleString()} items/sec)`);
console.log(`  Throughput: ${((data.length * 2) / (turboMedian / 1000) / 1_000_000).toFixed(2)}M ops/sec`);

// Benchmark Zod
try {
  const { z } = await import("zod");
  
  const zodSchema = z.object({
    name: z.string().min(2).max(100),
    age: z.number().min(18).max(120)
  });
  
  const zodTimes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    let valid = 0;
    for (const item of data) {
      const result = zodSchema.safeParse(item);
      if (result.success) valid++;
    }
    zodTimes.push(performance.now() - start);
  }
  const zodMedian = zodTimes.sort((a, b) => a - b)[Math.floor(zodTimes.length / 2)];
  
  console.log(`  Zod:   ${zodMedian.toFixed(2)}ms (${(data.length / (zodMedian / 1000)).toLocaleString()} items/sec)`);
  console.log(`  Throughput: ${((data.length * 2) / (zodMedian / 1000) / 1_000_000).toFixed(2)}M ops/sec`);
  console.log();
  
  const speedup = zodMedian / turboMedian;
  console.log("=".repeat(80));
  console.log("🚀 RESULT");
  console.log("=".repeat(80));
  console.log(`TURBO is ${speedup.toFixed(2)}x ${speedup >= 1 ? 'FASTER' : 'slower'} than Zod!`);
  console.log();
  
  if (speedup >= 1) {
    console.log("🎉🎉🎉 WE DID IT! TURBO MODE BEATS ZOD! 🎉🎉🎉");
  } else {
    console.log("⚠️  Still slower. Need more optimizations:");
    console.log("   - SIMD string operations");
    console.log("   - Schema compilation");
    console.log("   - Inline caching");
  }
  
} catch (e) {
  console.log("⚠️  Zod not installed. Install with: bun add zod");
}
