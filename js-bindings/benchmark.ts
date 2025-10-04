/**
 * Benchmark: dhi vs Zod v4
 */

import dhi from "./index";

// Test data
const users = Array.from({ length: 10000 }, (_, i) => ({
  name: `User${i}`,
  email: `user${i}@example.com`,
  age: 25,
  website: `https://user${i}.com`,
}));

// dhi schema
const dhiSchema = {
  name: dhi.z.string(2, 100),
  email: dhi.z.email(),
  age: dhi.z.positive(),
  website: dhi.z.url(),
};

console.log("🚀 dhi vs Zod v4 Benchmark");
console.log("=".repeat(80));
console.log(`Dataset: ${users.length} users`);
console.log();

// Benchmark dhi
console.log("Testing dhi (Zig + Bun FFI)...");
const dhiStart = performance.now();
const dhiResults = dhi.validateBatch(users, dhiSchema);
const dhiTime = performance.now() - dhiStart;
const dhiValid = dhiResults.filter(r => r.valid).length;

console.log(`  Time: ${dhiTime.toFixed(2)}ms`);
console.log(`  Throughput: ${(users.length / (dhiTime / 1000)).toLocaleString()} users/sec`);
console.log(`  Valid: ${dhiValid}/${users.length}`);
console.log();

// Try to benchmark Zod if installed
try {
  const { z } = await import("zod");
  
  const zodSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().positive(),
    website: z.string().url(),
  });
  
  console.log("Testing Zod v4...");
  const zodStart = performance.now();
  let zodValid = 0;
  for (const user of users) {
    const result = zodSchema.safeParse(user);
    if (result.success) zodValid++;
  }
  const zodTime = performance.now() - zodStart;
  
  console.log(`  Time: ${zodTime.toFixed(2)}ms`);
  console.log(`  Throughput: ${(users.length / (zodTime / 1000)).toLocaleString()} users/sec`);
  console.log(`  Valid: ${zodValid}/${users.length}`);
  console.log();
  
  // Comparison
  const speedup = zodTime / dhiTime;
  console.log("=".repeat(80));
  console.log("📊 Results:");
  console.log(`  dhi:  ${(users.length / (dhiTime / 1000)).toLocaleString()} users/sec`);
  console.log(`  Zod:  ${(users.length / (zodTime / 1000)).toLocaleString()} users/sec`);
  console.log(`  dhi is ${speedup.toFixed(2)}x faster! 🔥`);
  
} catch (e) {
  console.log("⚠️  Zod not installed. Install with: bun add zod");
  console.log();
  console.log("dhi performance:");
  console.log(`  ${(users.length / (dhiTime / 1000)).toLocaleString()} users/sec`);
}
