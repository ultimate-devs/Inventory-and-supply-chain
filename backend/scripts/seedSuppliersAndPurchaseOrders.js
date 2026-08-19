/**
 * Populates the Supplier and PurchaseOrder collections, which the DataCo
 * seed (seedFromDataCo.js) never touches - that script only derives
 * products/categories/demand from the DataCo CSV, so a freshly seeded
 * database has 0 suppliers and 0 purchase orders and the Suppliers /
 * Purchase Orders pages render correctly empty.
 *
 * Builds suppliers whose itemsCatalogue references real seeded Items (priced
 * near each item's unitCost, ± spread), and purchase orders against them
 * spanning the full PO_STATUS lifecycle with plausible statusHistory /
 * approvals, so reports (supplier performance radar, PO pipeline, budget
 * utilisation, category spend) have non-empty, non-trivial data to show.
 *
 * Idempotent - running it again skips suppliers that already exist by name
 * and exits early if any purchase order already exists (POs are generated
 * from whichever suppliers exist at run time, so re-running against a
 * partially-seeded DB could double up).
 *
 * Usage: node scripts/seedSuppliersAndPurchaseOrders.js
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Supplier, SUPPLIER_STATUS } from '../src/models/Supplier.js';
import { PurchaseOrder, PO_STATUS } from '../src/models/PurchaseOrder.js';
import { Item } from '../src/models/Item.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/config/roles.js';
import { getNextSequence } from '../src/models/Counter.js';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const rand = (min, max) => Math.round((min + Math.random() * (max - min)) * 100) / 100;
const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const SUPPLIER_SEEDS = [
  { name: 'Northbridge Sporting Supplies', status: SUPPLIER_STATUS.APPROVED, contactName: 'Dana Whitfield' },
  { name: 'Cascade Team Gear Co.', status: SUPPLIER_STATUS.APPROVED, contactName: 'Marcus Ilić' },
  { name: 'Harborline Athletics Wholesale', status: SUPPLIER_STATUS.APPROVED, contactName: 'Priya Anand' },
  { name: 'Redwood Fan Merchandise Group', status: SUPPLIER_STATUS.APPROVED, contactName: 'Owen Facchini' },
  { name: 'Summit Outdoor Distribution', status: SUPPLIER_STATUS.APPROVED, contactName: 'Leila Osei' },
  { name: 'Bramwell Apparel Partners', status: SUPPLIER_STATUS.PENDING, contactName: 'Tobias Renner' },
  { name: 'Coastline Golf & Leisure', status: SUPPLIER_STATUS.PENDING, contactName: 'Ines Vidal' },
  { name: 'Ashgrove Wholesale (delisted)', status: SUPPLIER_STATUS.SUSPENDED, contactName: 'Grant Whitmore' },
];

const buildScoreHistory = () =>
  Array.from({ length: 4 }, (_, i) => {
    const onTimeRate = rand(72, 99);
    const accuracyRate = rand(80, 99);
    const leadTimeReliability = rand(70, 98);
    const priceConsistency = rand(75, 99);
    return {
      date: daysAgo(120 - i * 30),
      onTimeRate,
      accuracyRate,
      leadTimeReliability,
      priceConsistency,
      overallScore: Math.round((onTimeRate + accuracyRate + leadTimeReliability + priceConsistency) / 4),
    };
  });

const seedSuppliers = async (items) => {
  const created = [];
  for (const seed of SUPPLIER_SEEDS) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Supplier.findOne({ name: seed.name });
    if (existing) {
      created.push(existing);
      console.log(`Supplier already exists, skipping: ${seed.name}`);
      continue;
    }

    const catalogueItems = pick(items, 4 + Math.floor(Math.random() * 5));
    const itemsCatalogue = catalogueItems.map((item) => ({
      item: item._id,
      supplierSku: `${seed.name.slice(0, 3).toUpperCase()}-${item.sku.slice(-6)}`,
      unitPrice: Math.max(0.5, rand(item.unitCost * 0.85, item.unitCost * 1.15)),
      leadTimeDays: Math.max(1, item.leadTimeDays + Math.round(rand(-2, 3))),
    }));

    const scoreHistory = seed.status === SUPPLIER_STATUS.APPROVED ? buildScoreHistory() : [];
    const latest = scoreHistory[scoreHistory.length - 1];

    // eslint-disable-next-line no-await-in-loop
    const supplier = await Supplier.create({
      name: seed.name,
      contactName: seed.contactName,
      contactEmail: `${seed.contactName.toLowerCase().replace(/[^a-z]+/g, '.')}@${seed.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 20)}.com`,
      contactPhone: `+44 20 ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`,
      address: '1 Trade Park Way, Manchester, UK',
      itemsCatalogue,
      scoreHistory,
      stats: latest
        ? {
            totalDeliveries: 20,
            onTimeDeliveries: Math.round((latest.onTimeRate / 100) * 20),
            totalReceivedLines: 60,
            accurateReceivedLines: Math.round((latest.accuracyRate / 100) * 60),
            leadTimeDeviationSum: rand(-10, 10),
            leadTimeSampleCount: 20,
            priceDeviationSum: rand(-5, 5),
            priceSampleCount: 20,
          }
        : undefined,
      onTimeRate: latest?.onTimeRate ?? 100,
      accuracyRate: latest?.accuracyRate ?? 100,
      leadTimeReliability: latest?.leadTimeReliability ?? 100,
      priceConsistency: latest?.priceConsistency ?? 100,
      performanceScore: latest?.overallScore ?? 100,
      status: seed.status,
      statusChangedAt: seed.status === SUPPLIER_STATUS.PENDING ? undefined : daysAgo(150),
    });
    created.push(supplier);
    console.log(`Created supplier: ${supplier.name} (${supplier.status})`);
  }
  return created;
};

/**
 * Builds one purchase order document (not via purchaseOrderService, so we
 * can backdate statusHistory/createdAt to get a spread of ages for the
 * reports) whose lines/prices come from the given supplier's own catalogue.
 */
const buildPurchaseOrder = async ({ supplier, requester, approver, secondApprover, status, ageDays, poSeq }) => {
  const lineCount = Math.min(supplier.itemsCatalogue.length, 1 + Math.floor(Math.random() * 3));
  const catalogueLines = pick(supplier.itemsCatalogue, lineCount);
  const lines = catalogueLines.map((entry) => {
    const quantity = 10 + Math.floor(Math.random() * 90);
    return { item: entry.item, quantity, unitPrice: entry.unitPrice, receivedQuantity: 0 };
  });
  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const requiresSecondApproval = totalAmount > 5000;

  const createdAt = daysAgo(ageDays);
  const statusHistory = [{ status: PO_STATUS.DRAFT, changedBy: requester._id, changedAt: createdAt }];
  const approvals = [];
  let expectedDeliveryDate;
  let actualDeliveryDate;
  const discrepancies = [];

  const advanceTo = (nextStatus, changedBy, offsetDays, note) => {
    statusHistory.push({ status: nextStatus, changedBy, changedAt: daysAgo(ageDays - offsetDays), note });
  };

  if (status !== PO_STATUS.DRAFT) advanceTo(PO_STATUS.SUBMITTED, requester._id, 1);

  if (status === PO_STATUS.REJECTED) {
    approvals.push({ level: 1, approver: approver._id, decision: 'rejected', decidedAt: daysAgo(ageDays - 2) });
    advanceTo(PO_STATUS.REJECTED, approver._id, 2, 'Pricing above budget for this cycle');
  } else if (status !== PO_STATUS.SUBMITTED && status !== PO_STATUS.DRAFT) {
    approvals.push({ level: 1, approver: approver._id, decision: 'approved', decidedAt: daysAgo(ageDays - 2) });
    if (requiresSecondApproval) {
      approvals.push({ level: 2, approver: secondApprover._id, decision: 'approved', decidedAt: daysAgo(ageDays - 3) });
      advanceTo(PO_STATUS.APPROVED, secondApprover._id, 3);
    } else {
      advanceTo(PO_STATUS.APPROVED, approver._id, 2);
    }

    if (status === PO_STATUS.CANCELLED) {
      advanceTo(PO_STATUS.CANCELLED, requester._id, 4, 'Supplier could not meet revised timeline');
    } else if (status !== PO_STATUS.APPROVED) {
      expectedDeliveryDate = daysAgo(ageDays - 10);
      advanceTo(PO_STATUS.SENT, requester._id, 4);
      if (status !== PO_STATUS.SENT) {
        advanceTo(PO_STATUS.SHIPPED, requester._id, 6);
        if (status === PO_STATUS.PARTIALLY_RECEIVED || status === PO_STATUS.RECEIVED) {
          actualDeliveryDate = daysAgo(ageDays - 9);
          lines.forEach((line, idx) => {
            const isPartial = status === PO_STATUS.PARTIALLY_RECEIVED && idx === 0;
            line.receivedQuantity = isPartial ? Math.max(1, line.quantity - Math.ceil(line.quantity * 0.3)) : line.quantity;
            if (isPartial) {
              discrepancies.push({
                item: line.item,
                orderedQuantity: line.quantity,
                receivedQuantity: line.receivedQuantity,
                type: 'under_delivery',
                variance: line.receivedQuantity - line.quantity,
                recordedAt: actualDeliveryDate,
              });
            }
          });
          advanceTo(status, requester._id, 9);
        }
      }
    }
  }

  return {
    poNumber: `PO-${new Date().getFullYear()}-${String(poSeq).padStart(5, '0')}`,
    supplier: supplier._id,
    requestedBy: requester._id,
    recommendedSupplier: Math.random() > 0.5,
    lines,
    totalAmount,
    status,
    statusHistory,
    requiresSecondApproval,
    approvals,
    discrepancies,
    expectedDeliveryDate,
    actualDeliveryDate,
    version: statusHistory.length - 1,
    createdAt,
  };
};

const seedPurchaseOrders = async (suppliers) => {
  const existingCount = await PurchaseOrder.countDocuments();
  if (existingCount > 0) {
    console.log(`\n${existingCount} purchase order(s) already exist - skipping purchase order seeding.`);
    return;
  }

  const [requester, approver, secondApprover] = await Promise.all([
    User.findOne({ role: ROLES.PROCUREMENT_OFFICER, email: { $not: /internal\.local$/ } }),
    User.findOne({ role: ROLES.INVENTORY_MANAGER }),
    User.findOne({ role: ROLES.SUPER_ADMIN }),
  ]);
  if (!requester || !approver || !secondApprover) {
    console.log('\nMissing one of procurement_officer/inventory_manager/super_admin users - skipping purchase order seeding.');
    return;
  }

  const approvedSuppliers = suppliers.filter((s) => s.status === SUPPLIER_STATUS.APPROVED && s.itemsCatalogue.length > 0);
  if (approvedSuppliers.length === 0) {
    console.log('\nNo approved suppliers with a catalogue - skipping purchase order seeding.');
    return;
  }

  // A spread across every lifecycle status, weighted toward the "steady
  // state" statuses (received/shipped) the way a real pipeline would be.
  const STATUS_PLAN = [
    { status: PO_STATUS.DRAFT, age: 1 },
    { status: PO_STATUS.SUBMITTED, age: 2 },
    { status: PO_STATUS.SUBMITTED, age: 3 },
    { status: PO_STATUS.APPROVED, age: 6 },
    { status: PO_STATUS.REJECTED, age: 8 },
    { status: PO_STATUS.SENT, age: 12 },
    { status: PO_STATUS.SENT, age: 14 },
    { status: PO_STATUS.SHIPPED, age: 16 },
    { status: PO_STATUS.PARTIALLY_RECEIVED, age: 20 },
    { status: PO_STATUS.RECEIVED, age: 25 },
    { status: PO_STATUS.RECEIVED, age: 40 },
    { status: PO_STATUS.RECEIVED, age: 55 },
    { status: PO_STATUS.RECEIVED, age: 70 },
    { status: PO_STATUS.CANCELLED, age: 18 },
  ];

  const docs = [];
  for (const [i, plan] of STATUS_PLAN.entries()) {
    const supplier = approvedSuppliers[i % approvedSuppliers.length];
    // eslint-disable-next-line no-await-in-loop
    const poSeq = await getNextSequence(`po-${new Date().getFullYear()}`);
    // eslint-disable-next-line no-await-in-loop
    const doc = await buildPurchaseOrder({
      supplier,
      requester,
      approver,
      secondApprover,
      status: plan.status,
      ageDays: plan.age,
      poSeq,
    });
    docs.push(doc);
  }

  await PurchaseOrder.insertMany(docs);
  console.log(`Created ${docs.length} purchase orders (requester: ${requester.email}, approver: ${approver.email}, 2nd approver: ${secondApprover.email}).`);
};

const run = async () => {
  await connectDB();
  console.log('Connected to MongoDB.\n');

  const items = await Item.find({ isDeleted: false });
  if (items.length === 0) {
    throw new Error('No items found - run `npm run seed` first so suppliers have something to catalogue.');
  }

  const suppliers = await seedSuppliers(items);
  await seedPurchaseOrders(suppliers);

  console.log('\nDone.');
  await disconnectDB();
};

run().catch(async (err) => {
  console.error('Seeding suppliers/purchase orders failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
