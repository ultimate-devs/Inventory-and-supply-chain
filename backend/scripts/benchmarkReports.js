/**
 * Proves (rather than just asserts) that every report endpoint stays under
 * the 500ms/10,000-item non-functional budget: seeds synthetic data up to
 * that scale if it isn't already there, then times each reportService.js
 * function directly against a real Mongo connection.
 *
 * Runs against a *separate* benchmark database by default (same host as
 * MONGODB_URI, database name suffixed `_benchmark`) so it never seeds 10k+
 * synthetic records into a developer's real working database. Point it at
 * something else via BENCHMARK_MONGODB_URI if you want.
 *
 * Usage: npm run benchmark:reports
 */
import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';
import { env } from '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Item } from '../src/models/Item.js';
import { Supplier, SUPPLIER_STATUS } from '../src/models/Supplier.js';
import { PurchaseOrder, PO_STATUS } from '../src/models/PurchaseOrder.js';
import { StockMovement, MOVEMENT_TYPES } from '../src/models/StockMovement.js';
import { GreedyRun } from '../src/models/GreedyRun.js';
// Not seeded directly (requestedBy/runBy just need a valid ObjectId below),
// but reportService.js populates through this ref, so the schema must be
// registered on this connection.
import '../src/models/User.js';
import { computeItemMetrics } from '../src/services/algorithms/computeItemMetrics.js';
import * as reportService from '../src/services/reportService.js';

const TARGET_ITEM_COUNT = 10000;
const BUDGET_MS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const benchmarkUri =
  process.env.BENCHMARK_MONGODB_URI || env.mongoUri.replace(/\/([^/?]+)(\?|$)/, '/inventory_supply_chain_benchmark$2');

const randomBetween = (min, max) => min + Math.random() * (max - min);
const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (days) => new Date(Date.now() - days * DAY_MS);

const seedCategoriesAndItems = async () => {
  console.log('  Categories...');
  const categories = await Category.insertMany(
    Array.from({ length: 25 }, (_, i) => ({ name: `Benchmark Category ${i + 1}` })),
  );

  console.log(`  Items (${TARGET_ITEM_COUNT})...`);
  const itemDocs = [];
  for (let i = 0; i < TARGET_ITEM_COUNT; i += 1) {
    const leadTimeDays = randomInt(2, 21);
    const safetyStock = randomInt(5, 50);
    const orderingCost = randomInt(10, 100);
    const holdingCostPerUnit = Number(randomBetween(0.5, 5).toFixed(2));
    const currentStock = randomInt(0, 500);
    const dailyDemandHistory = Array.from({ length: 30 }, (_, d) => ({
      date: daysAgo(30 - d),
      quantity: randomInt(0, 20),
    }));
    const metrics = computeItemMetrics(
      { dailyDemandHistory, leadTimeDays, safetyStock, serviceLevel: 95, orderingCost, holdingCostPerUnit, currentStock },
      {},
    );
    itemDocs.push({
      name: `Benchmark Item ${i}`,
      sku: `BM-${i}`,
      category: pick(categories)._id,
      unitCost: Number(randomBetween(1, 200).toFixed(2)),
      currentStock,
      leadTimeDays,
      orderingCost,
      holdingCostPerUnit,
      safetyStock,
      serviceLevel: 95,
      dailyDemandHistory,
      ...metrics,
    });
  }
  const items = await Item.insertMany(itemDocs, { ordered: false });
  return { categories, items };
};

const seedSuppliers = async () => {
  console.log('  Suppliers...');
  return Supplier.insertMany(
    Array.from({ length: 300 }, (_, i) => ({
      name: `Benchmark Supplier ${i}`,
      status: SUPPLIER_STATUS.APPROVED,
      onTimeRate: randomBetween(70, 100),
      accuracyRate: randomBetween(70, 100),
      leadTimeReliability: randomBetween(70, 100),
      priceConsistency: randomBetween(70, 100),
      performanceScore: randomBetween(70, 100),
    })),
  );
};

const seedStockMovements = async (items) => {
  console.log('  Stock movements...');
  const movementDocs = [];
  items.forEach((item) => {
    let stock = item.currentStock;
    const count = randomInt(1, 5);
    for (let m = 0; m < count; m += 1) {
      const delta = randomInt(-20, 20);
      stock = Math.max(0, stock + delta);
      movementDocs.push({
        item: item._id,
        type: MOVEMENT_TYPES.ADJUSTMENT,
        quantity: delta,
        resultingStock: stock,
        createdAt: daysAgo(randomInt(0, 90)),
      });
    }
  });
  await StockMovement.insertMany(movementDocs, { ordered: false });
};

const seedPurchaseOrders = async (items, suppliers) => {
  console.log('  Purchase orders (5,000)...');
  // No real User is seeded for this benchmark - requestedBy only needs to be
  // a valid ObjectId, none of the report pipelines join through to Users.
  const fakeUserId = new mongoose.Types.ObjectId();
  const nonReceivedStatuses = Object.values(PO_STATUS).filter((s) => s !== PO_STATUS.RECEIVED);

  const poDocs = Array.from({ length: 5000 }, (_, i) => {
    const supplier = pick(suppliers);
    const lines = Array.from({ length: randomInt(1, 3) }, () => {
      const item = pick(items);
      const quantity = randomInt(5, 100);
      return { item: item._id, quantity, unitPrice: item.unitCost, receivedQuantity: randomInt(0, quantity) };
    });
    const createdAt = daysAgo(randomInt(0, 365));
    const isReceived = Math.random() < 0.4;

    return {
      poNumber: `BM-PO-${i}`,
      supplier: supplier._id,
      requestedBy: fakeUserId,
      lines,
      totalAmount: lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
      status: isReceived ? PO_STATUS.RECEIVED : pick(nonReceivedStatuses),
      createdAt,
      expectedDeliveryDate: new Date(createdAt.getTime() + randomInt(3, 21) * DAY_MS),
      actualDeliveryDate: isReceived ? new Date(createdAt.getTime() + randomInt(1, 25) * DAY_MS) : undefined,
    };
  });

  await PurchaseOrder.insertMany(poDocs, { ordered: false });
};

const seedGreedyRuns = async () => {
  console.log('  Algorithm comparison runs (300)...');
  const fakeUserId = new mongoose.Types.ObjectId();
  const resultShape = (allocated, budget) => ({
    allocations: [],
    totalAllocated: allocated,
    unallocatedBudget: budget - allocated,
    itemsFullyCovered: randomInt(0, 10),
    itemsPartiallyCovered: randomInt(0, 5),
    itemsUncovered: randomInt(0, 5),
    weightedUrgencyServed: randomInt(0, 1000),
  });

  const runDocs = Array.from({ length: 300 }, () => {
    const budget = randomInt(500, 20000);
    const allocated = randomInt(0, budget);
    return {
      runBy: fakeUserId,
      budget,
      itemsConsidered: [],
      greedyResult: resultShape(allocated, budget),
      proportionalResult: resultShape(Math.max(0, allocated - randomInt(0, 100)), budget),
      ilpResult: resultShape(Math.min(budget, allocated + randomInt(0, 100)), budget),
      createdAt: daysAgo(randomInt(0, 180)),
    };
  });

  await GreedyRun.insertMany(runDocs, { ordered: false });
};

const ensureSeedData = async () => {
  const existingItems = await Item.countDocuments({});
  if (existingItems >= TARGET_ITEM_COUNT) {
    console.log(`Found ${existingItems} items already seeded - skipping generation.`);
    return;
  }

  console.log('Seeding synthetic benchmark data (one-time per benchmark database)...');
  const { items } = await seedCategoriesAndItems();
  const suppliers = await seedSuppliers();
  await seedStockMovements(items);
  await seedPurchaseOrders(items, suppliers);
  await seedGreedyRuns();
  console.log('Seed complete.\n');
};

const BENCHMARKS = [
  ['Stock Turnover', () => reportService.getStockTurnoverReport({})],
  ['Stock Status Breakdown', () => reportService.getStockStatusBreakdownReport()],
  ['Algorithm Comparison', () => reportService.getAlgorithmComparisonReport({ limit: 20 })],
  ['Budget Utilisation Over Time', () => reportService.getBudgetUtilisationOverTimeReport({})],
  ['Supplier Performance', () => reportService.getSupplierPerformanceReport()],
  ['PO Pipeline / Lead Time', () => reportService.getPurchaseOrderPipelineReport()],
  ['Category Spend', () => reportService.getCategorySpendReport({})],
];

const runBenchmarks = async () => {
  const itemCount = await Item.countDocuments({});
  console.log(`Benchmarking 7 report endpoints against a ${BUDGET_MS}ms budget (${itemCount} items)...\n`);

  const results = [];
  for (const [name, fn] of BENCHMARKS) {
    const start = performance.now();
    // eslint-disable-next-line no-await-in-loop
    await fn();
    results.push({ name, elapsed: performance.now() - start });
  }

  const nameWidth = Math.max(...results.map((r) => r.name.length)) + 2;
  results.forEach(({ name, elapsed }) => {
    const pass = elapsed < BUDGET_MS;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(nameWidth)} ${elapsed.toFixed(1)}ms`);
  });

  const failures = results.filter((r) => r.elapsed >= BUDGET_MS);
  if (failures.length > 0) {
    console.error(`\n${failures.length} report(s) exceeded the ${BUDGET_MS}ms budget.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll reports are within budget.');
  }
};

const main = async () => {
  console.log(`Connecting to benchmark database: ${benchmarkUri}`);
  await mongoose.connect(benchmarkUri);
  try {
    await ensureSeedData();
    await runBenchmarks();
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
