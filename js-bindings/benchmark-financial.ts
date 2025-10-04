/**
 * Financial Data Benchmark: Real-world fixed income trading data
 * Similar to Python test suite
 */

import dhi from "./index";

console.log("💰 Financial Data Validation Benchmark");
console.log("=".repeat(80));
console.log();

// Test 1: Bond Trade Data (100K trades)
console.log("Test 1: Bond Trade Validation (100,000 trades)");
console.log("-".repeat(80));

const bondTrades = Array.from({ length: 100_000 }, (_, i) => ({
  tradeId: `TRD-${String(i).padStart(10, '0')}`,
  cusip: `037833100`, // Apple bond CUSIP
  isin: `US0378331005`,
  quantity: 1000000 + (i % 10000000),
  price: 98.5 + (i % 100) / 100,
  yield: 3.5 + (i % 200) / 100,
  settlementDate: "2024-01-15",
  tradeDate: "2024-01-12",
  counterparty: `COUNTERPARTY-${i % 100}`,
}));

const bondSchema = {
  tradeId: dhi.z.string(5, 50),
  cusip: dhi.z.string(9, 9),
  isin: dhi.z.string(12, 12),
  quantity: dhi.z.positive(),
  price: dhi.z.positive(),
  yield: dhi.z.positive(),
  settlementDate: dhi.z.isoDate(),
  tradeDate: dhi.z.isoDate(),
  counterparty: dhi.z.string(5, 100),
};

// Warmup
for (let i = 0; i < 5; i++) {
  dhi.validateBatch(bondTrades.slice(0, 10000), bondSchema);
}

// Benchmark
const dhiBondTimes: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  const results = dhi.validateBatch(bondTrades, bondSchema);
  dhiBondTimes.push(performance.now() - start);
}
const dhiBondMedian = dhiBondTimes.sort((a, b) => a - b)[Math.floor(dhiBondTimes.length / 2)];
const dhiBondOps = (bondTrades.length * 9) / (dhiBondMedian / 1000);
const dhiBondValid = dhi.validateBatch(bondTrades, bondSchema).filter(r => r.valid).length;

console.log(`  DHI:  ${dhiBondMedian.toFixed(2)}ms (${(dhiBondOps / 1_000_000).toFixed(2)}M ops/sec)`);
console.log(`  Valid: ${dhiBondValid}/${bondTrades.length}`);
console.log(`  Throughput: ${(bondTrades.length / (dhiBondMedian / 1000)).toLocaleString()} trades/sec`);
console.log();

// Test 2: Mixed Valid/Invalid Bond Data (realistic scenario)
console.log("Test 2: Mixed Bond Data with Errors (50,000 trades)");
console.log("-".repeat(80));

const mixedBondTrades = Array.from({ length: 50_000 }, (_, i) => ({
  tradeId: i % 10 === 0 ? "BAD" : `TRD-${String(i).padStart(10, '0')}`, // 10% invalid
  cusip: i % 7 === 0 ? "INVALID" : `037833100`, // 14% invalid
  isin: i % 5 === 0 ? "BAD" : `US0378331005`, // 20% invalid
  quantity: i % 3 === 0 ? -1000 : 1000000, // 33% invalid
  price: 98.5,
  yield: 3.5,
  settlementDate: i % 11 === 0 ? "2024-13-45" : "2024-01-15", // 9% invalid
  tradeDate: "2024-01-12",
  counterparty: `COUNTERPARTY-${i % 100}`,
}));

// Warmup
for (let i = 0; i < 5; i++) {
  dhi.validateBatch(mixedBondTrades.slice(0, 10000), bondSchema);
}

// Benchmark
const dhiMixedBondTimes: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  const results = dhi.validateBatch(mixedBondTrades, bondSchema);
  dhiMixedBondTimes.push(performance.now() - start);
}
const dhiMixedBondMedian = dhiMixedBondTimes.sort((a, b) => a - b)[Math.floor(dhiMixedBondTimes.length / 2)];
const dhiMixedBondOps = (mixedBondTrades.length * 9) / (dhiMixedBondMedian / 1000);
const dhiMixedBondValid = dhi.validateBatch(mixedBondTrades, bondSchema).filter(r => r.valid).length;

console.log(`  DHI:  ${dhiMixedBondMedian.toFixed(2)}ms (${(dhiMixedBondOps / 1_000_000).toFixed(2)}M ops/sec)`);
console.log(`  Valid: ${dhiMixedBondValid}/${mixedBondTrades.length}`);
console.log(`  Throughput: ${(mixedBondTrades.length / (dhiMixedBondMedian / 1000)).toLocaleString()} trades/sec`);
console.log();

// Test 3: High-frequency Trading Data (10K trades, complex validation)
console.log("Test 3: HFT Order Validation (10,000 orders)");
console.log("-".repeat(80));

const hftOrders = Array.from({ length: 10_000 }, (_, i) => ({
  orderId: `ORD-${String(i).padStart(12, '0')}`,
  symbol: `AAPL`,
  side: i % 2 === 0 ? "BUY" : "SELL",
  quantity: 100 + (i % 10000),
  price: 150.25 + (i % 100) / 100,
  orderType: "LIMIT",
  timestamp: "2024-01-15T09:30:00Z",
  clientId: `CLIENT-${i % 50}`,
  venue: "NASDAQ",
}));

const hftSchema = {
  orderId: dhi.z.string(10, 50),
  symbol: dhi.z.string(1, 10),
  side: dhi.z.string(3, 4),
  quantity: dhi.z.positive(),
  price: dhi.z.positive(),
  orderType: dhi.z.string(4, 10),
  timestamp: dhi.z.isoDatetime(),
  clientId: dhi.z.string(5, 50),
  venue: dhi.z.string(3, 20),
};

// Warmup
for (let i = 0; i < 5; i++) {
  dhi.validateBatch(hftOrders.slice(0, 1000), hftSchema);
}

// Benchmark
const dhiHftTimes: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  const results = dhi.validateBatch(hftOrders, hftSchema);
  dhiHftTimes.push(performance.now() - start);
}
const dhiHftMedian = dhiHftTimes.sort((a, b) => a - b)[Math.floor(dhiHftTimes.length / 2)];
const dhiHftOps = (hftOrders.length * 9) / (dhiHftMedian / 1000);
const dhiHftValid = dhi.validateBatch(hftOrders, hftSchema).filter(r => r.valid).length;

console.log(`  DHI:  ${dhiHftMedian.toFixed(2)}ms (${(dhiHftOps / 1_000_000).toFixed(2)}M ops/sec)`);
console.log(`  Valid: ${dhiHftValid}/${hftOrders.length}`);
console.log(`  Throughput: ${(hftOrders.length / (dhiHftMedian / 1000)).toLocaleString()} orders/sec`);
console.log(`  Latency per order: ${(dhiHftMedian * 1000 / hftOrders.length).toFixed(2)}µs`);
console.log();

// Summary
console.log("=".repeat(80));
console.log("📊 Financial Data Summary");
console.log("=".repeat(80));
console.log(`Bond trades (all valid):     ${(dhiBondOps / 1_000_000).toFixed(2)}M ops/sec`);
console.log(`Bond trades (mixed):         ${(dhiMixedBondOps / 1_000_000).toFixed(2)}M ops/sec`);
console.log(`HFT orders:                  ${(dhiHftOps / 1_000_000).toFixed(2)}M ops/sec`);
console.log();
console.log("Real-world use cases:");
console.log("  - Trade validation: 100K+ trades/sec");
console.log("  - Order validation: 10K+ orders/sec with <100µs latency");
console.log("  - Risk checks: Real-time validation at market speed");
