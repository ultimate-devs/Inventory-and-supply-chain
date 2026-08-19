/**
 * Ad-hoc evidence script for the dissertation Results chapter: runs the real
 * ROP/EOQ/urgency/allocation algorithms against real DataCo product data,
 * through the actual service functions (computeItemMetrics via the Item
 * pre-save hook, buildCandidateItems, compareAllocations) - no mocked math.
 *
 * Seeds into an ephemeral in-memory Mongo replica set (same pattern as
 * benchmark:reports:local), so it never touches a developer's real database
 * and needs no Docker/local Mongo install.
 *
 * Usage: node scripts/algorithmShowcase.js
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import mongoose from 'mongoose';
import { Category } from '../src/models/Category.js';
import { Item } from '../src/models/Item.js';
import { buildCandidateItems } from '../src/services/algorithmService.js';
import { compareAllocations } from '../src/services/algorithms/algorithmComparison.js';
import { runRopEoqScenario } from '../src/services/algorithms/ropEoqScenario.js';
import { SERVICE_LEVEL_Z } from '../src/services/algorithms/rop.js';

const runSeed = (uri) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/seedFromDataCo.js'], {
      env: { ...process.env, MONGODB_URI: uri },
      stdio: 'inherit',
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`seed exited ${code}`))));
  });

const money = (n) => `£${Number(n).toFixed(2)}`;
const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const padL = (s, n) => String(s).padStart(n);
const line = (n) => '-'.repeat(n);

const main = async () => {
  console.log('=== Algorithm Showcase: real DataCo product data, real service functions ===\n');
  console.log('Starting ephemeral in-memory Mongo replica set...');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = replSet.getUri();
  console.log(`Replica set ready.\n`);

  console.log('Seeding real DataCo Smart Supply Chain product data (npm run seed logic)...');
  await runSeed(uri);
  console.log('');

  await mongoose.connect(uri);

  // ---------------------------------------------------------------------
  // Table A: real seeded items with server-computed ROP/EOQ (Item pre-save
  // hook -> computeItemMetrics -> calculateROPSimple / calculateROPProbabilistic
  // / calculateEOQ), exactly as they'd be after a real product create/update.
  // ---------------------------------------------------------------------
  const categories = await Category.find({}).sort({ name: 1 });
  console.log('='.repeat(100));
  console.log('TABLE A - Real seeded items: server-computed ROP (simple + 95% probabilistic) and EOQ');
  console.log('='.repeat(100));

  const allItems = [];
  for (const cat of categories) {
    const items = await Item.find({ category: cat._id }).sort({ name: 1 });
    allItems.push(...items);
    console.log(`\n${cat.name}  (${items.length} real products)`);
    console.log(
      pad('Product', 34) +
        padL('AvgDmd/d', 9) +
        padL('LeadT', 6) +
        padL('ROP(s)', 8) +
        padL('ROP(p95)', 9) +
        padL('EOQ', 8) +
        padL('Stock', 7) +
        '  Status',
    );
    console.log(line(96));
    items.forEach((it) => {
      console.log(
        pad(it.name, 34) +
          padL(it.avgDailyDemand.toFixed(1), 9) +
          padL(it.leadTimeDays, 6) +
          padL(it.reorderPointSimple.toFixed(1), 8) +
          padL(it.reorderPointProbabilistic.toFixed(1), 9) +
          padL(it.economicOrderQuantity.toFixed(1), 8) +
          padL(it.currentStock, 7) +
          '  ' +
          it.stockStatus.toUpperCase(),
      );
    });
  }

  // ---------------------------------------------------------------------
  // Table B: probabilistic ROP at 90/95/99% service level for one real item,
  // via the same runRopEoqScenario() the Advisory agent and ROP/EOQ what-if
  // calculator use.
  // ---------------------------------------------------------------------
  const sample = allItems.reduce((a, b) => (b.avgDailyDemand > a.avgDailyDemand ? b : a));
  console.log(`\n${'='.repeat(100)}`);
  console.log(`TABLE B - Service-level sensitivity for a real item: "${sample.name}"`);
  console.log('='.repeat(100));
  console.log(
    `avgDailyDemand=${sample.avgDailyDemand.toFixed(2)}  demandStdDev=${sample.demandStdDev.toFixed(2)}  ` +
      `leadTimeDays=${sample.leadTimeDays}  orderingCost=${money(sample.orderingCost)}  holdingCost/unit=${money(sample.holdingCostPerUnit)}\n`,
  );
  console.log(pad('Service level', 16) + padL('Z-score', 9) + padL('ROP simple', 12) + padL('ROP prob.', 12) + padL('EOQ', 10));
  console.log(line(60));
  [90, 95, 99].forEach((sl) => {
    const r = runRopEoqScenario({
      avgDailyDemand: sample.avgDailyDemand,
      leadTimeDays: sample.leadTimeDays,
      demandStdDev: sample.demandStdDev,
      safetyStock: sample.safetyStock,
      serviceLevel: sl,
      orderingCost: sample.orderingCost,
      holdingCostPerUnit: sample.holdingCostPerUnit,
    });
    console.log(
      pad(`${sl}%`, 16) +
        padL(SERVICE_LEVEL_Z[sl], 9) +
        padL(r.reorderPointSimple.toFixed(1), 12) +
        padL(r.reorderPointProbabilistic.toFixed(1), 12) +
        padL(r.economicOrderQuantity.toFixed(1), 10),
    );
  });

  // ---------------------------------------------------------------------
  // The freshly-seeded catalogue already has real LOW-stock items - the
  // seed script's "~1.5x lead-time demand plus safety stock" starting point
  // lands some real, low-velocity products below their own reorder point
  // with no simulation needed. That set alone is used for the allocation
  // demo below. One additional item is nudged below safety stock (still a
  // real `.save()` through the real pre-save recalculation hook, not a
  // fabricated field) purely to have one genuine CRITICAL example alongside
  // the organic LOW ones - disclosed here, not hidden.
  // ---------------------------------------------------------------------
  sample.currentStock = Math.max(0, Math.round(sample.safetyStock * 0.5));
  await sample.save();
  console.log(`\n(One item, "${sample.name}", nudged below safety stock to add a real CRITICAL example - see note above.)\n`);

  // ---------------------------------------------------------------------
  // Table C: real low/critical candidates, via the actual buildCandidateItems()
  // the /allocations API route calls.
  // ---------------------------------------------------------------------
  const candidates = await buildCandidateItems();
  console.log('='.repeat(100));
  console.log(`TABLE C - Real allocation candidates (stockStatus in critical/low): ${candidates.length} items`);
  console.log('='.repeat(100));
  console.log(pad('Item', 34) + padL('Urgency', 9) + padL('Qty needed', 11) + padL('Unit cost', 11) + padL('Need (£)', 11));
  console.log(line(76));
  candidates
    .slice()
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .forEach((c) => {
      console.log(
        pad(c.name, 34) +
          padL(c.urgencyScore.toFixed(1), 9) +
          padL(c.quantityNeeded, 11) +
          padL(money(c.unitCost), 11) +
          padL(money(c.neededValue), 11),
      );
    });
  const totalNeed = candidates.reduce((s, c) => s + c.neededValue, 0);
  console.log(`\nTotal capital need across candidates: ${money(totalNeed)}`);

  // ---------------------------------------------------------------------
  // ILP is exact only up to MAX_EXACT_ITEMS (20) candidates by design (see
  // ilp.js) - above that it falls back to Greedy rather than hang a request.
  // A Procurement Officer narrowing a funding round to specific items is a
  // real, supported flow (buildCandidateItems(itemIds)), so this uses that
  // same real path to focus on the 18 highest-urgency real candidates,
  // rather than fabricating data to fit the limit.
  // ---------------------------------------------------------------------
  const focusIds = candidates
    .slice()
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, 18)
    .map((c) => c.item);
  const focusCandidates = await buildCandidateItems(focusIds);
  const focusNeed = focusCandidates.reduce((s, c) => s + c.neededValue, 0);
  console.log(
    `Procurement Officer narrows this funding round to the ${focusCandidates.length} highest-urgency real items ` +
      `(total need ${money(focusNeed)}) via buildCandidateItems(itemIds) - the same narrowing the /allocations UI supports.`,
  );

  // ---------------------------------------------------------------------
  // Table D: budget sweep. Same real candidates, same compareAllocations()
  // the /allocations/compare route calls, swept across a realistic budget
  // range so the comparison isn't cherry-picked to one point - it shows
  // where ILP and Greedy agree and where they genuinely diverge.
  // ---------------------------------------------------------------------

  const sweepBudgets = [1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000].filter((b) => b < focusNeed);
  console.log(`\n${'='.repeat(100)}`);
  console.log(`TABLE D - Greedy vs Proportional vs ILP, swept across budget (${focusCandidates.length} real candidates)`);
  console.log('='.repeat(100));
  console.log(
    pad('Budget', 10) + padL('Greedy urg.', 13) + padL('Prop. urg.', 12) + padL('ILP urg.', 10) + padL('ILP-Greedy', 12) + '  Note',
  );
  console.log(line(96));
  let bestBudget = sweepBudgets[0];
  let bestDelta = -Infinity;
  const sweepResults = sweepBudgets.map((b) => {
    const r = compareAllocations(focusCandidates, b);
    const delta = r.deltas.ilp.vsGreedy.weightedUrgencyServed;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestBudget = b;
    }
    console.log(
      pad(money(b), 10) +
        padL(r.greedy.weightedUrgencyServed.toFixed(1), 13) +
        padL(r.proportional.weightedUrgencyServed.toFixed(1), 12) +
        padL(r.ilp.weightedUrgencyServed.toFixed(1), 10) +
        padL(`+${delta.toFixed(1)}`, 12) +
        (r.ilp.note ? '  (ILP fell back to greedy)' : delta > 0.01 ? '  ILP beats greedy' : '  ILP matches greedy'),
    );
    return { budget: b, ...r };
  });

  console.log(
    `\nBest ILP-vs-Greedy divergence at budget ${money(bestBudget)} (+${bestDelta.toFixed(1)} weighted urgency). Detailed breakdown below.\n`,
  );

  const { greedy, proportional, ilp, deltas } = sweepResults.find((r) => r.budget === bestBudget);
  console.log('='.repeat(100));
  console.log(`TABLE E - Detailed comparison at budget ${money(bestBudget)}`);
  console.log('='.repeat(100));
  console.log(
    pad('Metric', 26) + padL('Greedy', 14) + padL('Proportional', 14) + padL('ILP', 14),
  );
  console.log(line(68));
  const rows = [
    ['Total allocated', money(greedy.totalAllocated), money(proportional.totalAllocated), money(ilp.totalAllocated)],
    ['Unallocated budget', money(greedy.unallocatedBudget), money(proportional.unallocatedBudget), money(ilp.unallocatedBudget)],
    ['Items fully covered', greedy.itemsFullyCovered, proportional.itemsFullyCovered, ilp.itemsFullyCovered],
    ['Items partially covered', greedy.itemsPartiallyCovered, proportional.itemsPartiallyCovered, ilp.itemsPartiallyCovered],
    ['Items uncovered', greedy.itemsUncovered, proportional.itemsUncovered, ilp.itemsUncovered],
    ['Weighted urgency served', greedy.weightedUrgencyServed.toFixed(1), proportional.weightedUrgencyServed.toFixed(1), ilp.weightedUrgencyServed.toFixed(1)],
  ];
  rows.forEach(([label, g, p, i]) => console.log(pad(label, 26) + padL(g, 14) + padL(p, 14) + padL(i, 14)));

  if (ilp.note) console.log(`\nILP note: ${ilp.note}`);

  console.log(`\nDelta (ILP vs Greedy):        totalAllocated ${money(deltas.ilp.vsGreedy.totalAllocated)}   weightedUrgencyServed ${deltas.ilp.vsGreedy.weightedUrgencyServed.toFixed(1)}`);
  console.log(`Delta (ILP vs Proportional):  totalAllocated ${money(deltas.ilp.vsProportional.totalAllocated)}   weightedUrgencyServed ${deltas.ilp.vsProportional.weightedUrgencyServed.toFixed(1)}`);

  console.log(`\n${'='.repeat(100)}`);
  console.log(`Per-item allocation at budget ${money(bestBudget)}: Greedy vs ILP (all real candidates)`);
  console.log('='.repeat(100));
  console.log(pad('Item', 34) + padL('Urgency', 9) + padL('Need (£)', 10) + padL('Greedy £', 10) + padL('ILP £', 10) + '  Diverges?');
  console.log(line(92));
  const byName = (arr) => Object.fromEntries(arr.allocations.map((a) => [a.name, a]));
  const gMap = byName(greedy);
  const iMap = byName(ilp);
  focusCandidates
    .slice()
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .forEach((c) => {
      const g = gMap[c.name];
      const il = iMap[c.name];
      const diverges = Math.abs(g.allocatedAmount - il.allocatedAmount) > 0.5;
      console.log(
        pad(c.name, 34) +
          padL(c.urgencyScore.toFixed(1), 9) +
          padL(money(c.neededValue), 10) +
          padL(money(g.allocatedAmount), 10) +
          padL(money(il.allocatedAmount), 10) +
          (diverges ? '  <-- yes' : ''),
      );
    });

  console.log('\nDone.');
  await mongoose.disconnect();
  await replSet.stop();
};

main().catch(async (err) => {
  console.error('algorithmShowcase failed:', err);
  process.exit(1);
});
