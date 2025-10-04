import { z as dhiFast } from "./schema-fast";

console.log("⚡ FAST Schema vs Zod Benchmark");
console.log("=".repeat(80));

const data = Array.from({ length: 100_000 }, (_, i) => ({
  name: `User${i}`,
  email: `user${i}@example.com`,
  age: 25 + (i % 50),
  role: ["admin", "user", "guest"][i % 3],
  active: i % 2 === 0
}));

const fastSchema = dhiFast.object({
  name: dhiFast.string().min(2).max(100),
  email: dhiFast.string().email(),
  age: dhiFast.number().positive().int(),
  role: dhiFast.enum(["admin", "user", "guest"]),
  active: dhiFast.boolean()
});

// Warmup
for (let i = 0; i < 5; i++) {
  for (const item of data.slice(0, 1000)) {
    fastSchema.safeParse(item);
  }
}

// Benchmark Fast
const fastTimes: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  let valid = 0;
  for (const item of data) {
    const result = fastSchema.safeParse(item);
    if (result.success) valid++;
  }
  fastTimes.push(performance.now() - start);
}
const fastMedian = fastTimes.sort((a, b) => a - b)[Math.floor(fastTimes.length / 2)];
const fastOps = (data.length * 5) / (fastMedian / 1000) / 1_000_000;

console.log(`  FAST:  ${fastMedian.toFixed(2)}ms (${fastOps.toFixed(2)}M ops/sec)`);

// Benchmark Zod
try {
  const { z } = await import("zod");
  
  const zodSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().positive().int(),
    role: z.enum(["admin", "user", "guest"]),
    active: z.boolean()
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
  const zodOps = (data.length * 5) / (zodMedian / 1000) / 1_000_000;
  
  console.log(`  Zod:   ${zodMedian.toFixed(2)}ms (${zodOps.toFixed(2)}M ops/sec)`);
  console.log();
  console.log("=".repeat(80));
  console.log(zodMedian > fastMedian 
    ? `🎉 FAST is ${(zodMedian / fastMedian).toFixed(2)}x FASTER than Zod!`
    : `⚠️  Still ${(fastMedian / zodMedian).toFixed(2)}x slower. Need more optimization.`);
} catch (e) {
  console.log("Zod not installed");
}
