import dhiOld from "./index";
import dhiExtreme from "./index-extreme";

const users = Array.from({ length: 10000 }, (_, i) => ({
  name: `User${i}`,
  email: `user${i}@example.com`,
  age: 25,
  website: `https://user${i}.com`,
}));

const schema = {
  name: dhiOld.z.string(2, 100),
  email: dhiOld.z.email(),
  age: dhiOld.z.positive(),
  website: dhiOld.z.url(),
};

console.log("🚀 dhi EXTREME Optimization Benchmark");
console.log("=".repeat(80));
console.log(`Dataset: ${users.length} users with 4 validators each`);
console.log(`Total validations: ${users.length * 4} = 40,000`);
console.log();

// Warmup
console.log("Warming up...");
for (let i = 0; i < 10; i++) {
  dhiOld.validateBatch(users, schema);
  dhiExtreme.validateBatch(users, schema);
}
console.log();

// Benchmark old version
console.log("Testing OLD version (optimized batch)...");
const oldTimes: number[] = [];
for (let i = 0; i < 50; i++) {
  const start = performance.now();
  const results = dhiOld.validateBatch(users, schema);
  oldTimes.push(performance.now() - start);
}
const oldMedian = oldTimes.sort((a, b) => a - b)[Math.floor(oldTimes.length / 2)];
const oldValid = dhiOld.validateBatch(users, schema).filter(r => r.valid).length;

console.log(`  Time: ${oldMedian.toFixed(3)}ms (median of 50 runs)`);
console.log(`  Throughput: ${(users.length / (oldMedian / 1000)).toLocaleString()} users/sec`);
console.log(`  Throughput: ${((users.length * 4) / (oldMedian / 1000) / 1_000_000).toFixed(2)}M validations/sec`);
console.log(`  Valid: ${oldValid}/${users.length}`);
console.log();

// Benchmark EXTREME version
console.log("Testing EXTREME version (SharedArrayBuffer + zero-copy)...");
const extremeTimes: number[] = [];
for (let i = 0; i < 50; i++) {
  const start = performance.now();
  const results = dhiExtreme.validateBatch(users, schema);
  extremeTimes.push(performance.now() - start);
}
const extremeMedian = extremeTimes.sort((a, b) => a - b)[Math.floor(extremeTimes.length / 2)];
const extremeValid = dhiExtreme.validateBatch(users, schema).filter(r => r.valid).length;

console.log(`  Time: ${extremeMedian.toFixed(3)}ms (median of 50 runs)`);
console.log(`  Throughput: ${(users.length / (extremeMedian / 1000)).toLocaleString()} users/sec`);
console.log(`  Throughput: ${((users.length * 4) / (extremeMedian / 1000) / 1_000_000).toFixed(2)}M validations/sec`);
console.log(`  Valid: ${extremeValid}/${users.length}`);
console.log();

// Comparison
const speedup = oldMedian / extremeMedian;
console.log("=".repeat(80));
console.log("📊 Results:");
console.log(`  Old:     ${((users.length * 4) / (oldMedian / 1000) / 1_000_000).toFixed(2)}M validations/sec`);
console.log(`  Extreme: ${((users.length * 4) / (extremeMedian / 1000) / 1_000_000).toFixed(2)}M validations/sec`);
console.log(`  Speedup: ${speedup.toFixed(2)}x faster! 🔥`);
console.log();

// Compare to Zod
try {
  const { z } = await import("zod");
  
  const zodSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().positive(),
    website: z.string().url(),
  });
  
  console.log("Testing Zod v4...");
  const zodTimes: number[] = [];
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    let zodValid = 0;
    for (const user of users) {
      const result = zodSchema.safeParse(user);
      if (result.success) zodValid++;
    }
    zodTimes.push(performance.now() - start);
  }
  const zodMedian = zodTimes.sort((a, b) => a - b)[Math.floor(zodTimes.length / 2)];
  
  console.log(`  Zod:     ${((users.length * 4) / (zodMedian / 1000) / 1_000_000).toFixed(2)}M validations/sec`);
  console.log(`  Extreme: ${((users.length * 4) / (extremeMedian / 1000) / 1_000_000).toFixed(2)}M validations/sec`);
  console.log(`  dhi is ${(zodMedian / extremeMedian).toFixed(2)}x faster than Zod! 🚀`);
  console.log();
} catch (e) {
  console.log("(Zod not installed for comparison)");
  console.log();
}

// Compare to Python
console.log("=".repeat(80));
console.log("🐍 Comparison to Python:");
console.log(`  Python (dhi):     27.3M validations/sec`);
console.log(`  JavaScript (dhi): ${((users.length * 4) / (extremeMedian / 1000) / 1_000_000).toFixed(2)}M validations/sec`);
const pythonRatio = 27.3 / ((users.length * 4) / (extremeMedian / 1000) / 1_000_000);
console.log(`  Python is ${pythonRatio.toFixed(2)}x faster`);
console.log();
console.log("Remaining gap due to:");
console.log("  - JavaScript → WASM boundary overhead");
console.log("  - String encoding (UTF-8 conversion)");
console.log("  - Memory allocation overhead");
console.log("  - No SIMD yet (future optimization)");
