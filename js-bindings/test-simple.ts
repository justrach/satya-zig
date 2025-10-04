import dhi from "./index";

// Simple test
const users = [
  { name: "Alice", email: "alice@example.com", age: 25, website: "https://alice.com" },
  { name: "Bob", email: "bob@example.com", age: 30, website: "https://bob.io" },
];

const schema = {
  name: dhi.z.string(2, 100),
  email: dhi.z.email(),
  age: dhi.z.positive(),
  website: dhi.z.url(),
};

console.log("Testing individual validation:");
const result1 = dhi.validate(users[0], schema);
console.log("User 1:", result1);

console.log("\nTesting batch validation (2 items - should use individual):");
const results2 = dhi.validateBatch(users, schema);
console.log("Results:", results2);

console.log("\nTesting batch validation (200 items - should use optimized):");
const manyUsers = Array.from({ length: 200 }, (_, i) => ({
  name: `User${i}`,
  email: `user${i}@example.com`,
  age: 25,
  website: `https://user${i}.com`,
}));
const results200 = dhi.validateBatch(manyUsers, schema);
console.log(`Valid: ${results200.filter(r => r.valid).length}/${results200.length}`);
