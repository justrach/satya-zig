import dhiOld from "./index";
import dhiUltra from "./index-ultra";

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

console.log("🚀 dhi Optimization Comparison");
console.log("=".repeat(80));
console.log(`Dataset: ${users.length} users with 4 validators each`);
console.log();

// Warmup
for (let i = 0; i < 5; i++) {
  dhiOld.validateBatch(users, schema);
  dhiUltra.validateBatch(users, schema);
}

// Benchmark old version
const oldTimes: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  const results = dhiOld.validateBatch(users, schema);
  oldTimes.push(performance.now() - start);
}
const oldMedian = oldTimes.sort((a, b) => a - b)[Math.floor(oldTimes.length / 2)];
const oldValid = dhiOld.validateBatch(users, schema).filter(r => r.valid).length;

console.log("Old version (smart batch detection):");
console.log(`  Time: ${oldMedian.toFixed(2)}ms`);
console.log(`  Throughput: ${(users.length / (oldMedian / 1000)).toLocaleString()} users/sec`);
console.log(`  Valid: ${oldValid}/${users.length}`);
console.log();

// Benchmark ultra version
const ultraTimes: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  const results = dhiUltra.validateBatch(users, schema);
  ultraTimes.push(performance.now() - start);
}
const ultraMedian = ultraTimes.sort((a, b) => a - b)[Math.floor(ultraTimes.length / 2)];
const ultraValid = dhiUltra.validateBatch(users, schema).filter(r => r.valid).length;

console.log("Ultra-optimized (single WASM call):");
console.log(`  Time: ${ultraMedian.toFixed(2)}ms`);
console.log(`  Throughput: ${(users.length / (ultraMedian / 1000)).toLocaleString()} users/sec`);
console.log(`  Valid: ${ultraValid}/${users.length}`);
console.log();

// Comparison
const speedup = oldMedian / ultraMedian;
console.log("=".repeat(80));
console.log("📊 Results:");
console.log(`  Old:   ${(users.length / (oldMedian / 1000)).toLocaleString()} users/sec`);
console.log(`  Ultra: ${(users.length / (ultraMedian / 1000)).toLocaleString()} users/sec`);
console.log(`  Ultra is ${speedup.toFixed(2)}x faster! 🔥`);
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
  
  const zodTimes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    let zodValid = 0;
    for (const user of users) {
      const result = zodSchema.safeParse(user);
      if (result.success) zodValid++;
    }
    zodTimes.push(performance.now() - start);
  }
  const zodMedian = zodTimes.sort((a, b) => a - b)[Math.floor(zodTimes.length / 2)];
  
  console.log("vs Zod v4:");
  console.log(`  Zod:   ${(users.length / (zodMedian / 1000)).toLocaleString()} users/sec`);
  console.log(`  Ultra: ${(users.length / (ultraMedian / 1000)).toLocaleString()} users/sec`);
  console.log(`  dhi is ${(zodMedian / ultraMedian).toFixed(2)}x faster than Zod! 🚀`);
} catch (e) {
  console.log("(Zod not installed for comparison)");
}
