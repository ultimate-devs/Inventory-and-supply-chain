import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../utils/testDb.js';
import { User } from '../../src/models/User.js';
import { ROLES } from '../../src/config/roles.js';
import { GreedyRun } from '../../src/models/GreedyRun.js';

let app;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

const loginAs = async (email, role) => {
  const passwordHash = await User.hashPassword('ReportsPass1');
  await User.create({ name: email, email, passwordHash, role });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'ReportsPass1' });
  return res.body.data.accessToken;
};

const as = (token) => (req) => req.set('Authorization', `Bearer ${token}`);

/**
 * Seeds one category/item, one approved supplier carrying it, a full PO
 * lifecycle through to received (so supplier scoring + category spend have
 * real data), and one saved algorithm comparison run - enough for all 7
 * reports to return non-empty, meaningful data.
 */
const seedReportData = async () => {
  const manager = as(await loginAs('reports-manager@example.com', ROLES.INVENTORY_MANAGER));
  const procurement = as(await loginAs('reports-procurement@example.com', ROLES.PROCUREMENT_OFFICER));

  const category = await manager(request(app).post('/api/v1/categories')).send({ name: 'Reports Category' });
  const categoryId = category.body.data._id;

  const item = await manager(request(app).post('/api/v1/items')).send({
    name: 'Reported Widget',
    sku: 'RPT-1',
    category: categoryId,
    unitCost: 10,
    currentStock: 2,
    safetyStock: 20,
    leadTimeDays: 5,
  });
  const itemId = item.body.data._id;

  const supplier = await procurement(request(app).post('/api/v1/suppliers')).send({ name: 'Reports Supplier' });
  const supplierId = supplier.body.data._id;
  await procurement(request(app).patch(`/api/v1/suppliers/${supplierId}/status`)).send({ status: 'approved' });
  await procurement(request(app).post(`/api/v1/suppliers/${supplierId}/catalogue`)).send({
    item: itemId,
    unitPrice: 10,
    leadTimeDays: 5,
  });

  const po = await procurement(request(app).post('/api/v1/purchase-orders')).send({
    supplier: supplierId,
    lines: [{ item: itemId, quantity: 10, unitPrice: 10 }],
  });
  const poId = po.body.data._id;
  await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });
  await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });
  await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({ version: 2 });
  await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/receive`)).send({
    version: 3,
    lines: [{ item: itemId, receivedQuantity: 10 }],
  });

  const compareRun = await manager(request(app).post('/api/v1/algorithms/compare')).send({ budget: 100 });

  return { manager, procurement, categoryId, itemId, supplierId, poId, runId: compareRun.body.data.run._id };
};

describe('Reports/Analytics endpoints', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/reports/stock-turnover');
    expect(res.status).toBe(401);
  });

  it('is readable by an Analyst (read-only role, no write access elsewhere)', async () => {
    await seedReportData();
    const analyst = as(await loginAs('reports-analyst@example.com', ROLES.ANALYST));
    const res = await analyst(request(app).get('/api/v1/reports/category-spend'));
    expect(res.status).toBe(200);
  });

  it('returns stock turnover per item, with a working CSV export', async () => {
    const { manager, itemId } = await seedReportData();

    const res = await manager(request(app).get('/api/v1/reports/stock-turnover'));
    expect(res.status).toBe(200);
    const row = res.body.data.find((r) => r.itemId === itemId);
    expect(row).toBeDefined();
    expect(row.sku).toBe('RPT-1');
    expect(row.category).toBe('Reports Category');
    expect(typeof row.turnoverRatio).toBe('number');

    const csv = await manager(request(app).get('/api/v1/reports/stock-turnover?format=csv'));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.split('\n')[0]).toBe('SKU,Item,Category,Annual Demand,Average Stock,Turnover Ratio');
    expect(csv.text).toContain('RPT-1');
  });

  it('returns stock status breakdown overall and by category', async () => {
    const { manager } = await seedReportData();
    const res = await manager(request(app).get('/api/v1/reports/stock-status-breakdown'));
    expect(res.status).toBe(200);
    expect(res.body.data.byStatus.length).toBeGreaterThan(0);
    expect(res.body.data.byCategory.some((r) => r.category === 'Reports Category')).toBe(true);
  });

  it('returns the algorithm comparison report including the ilp result', async () => {
    const { manager, runId } = await seedReportData();
    const res = await manager(request(app).get('/api/v1/reports/algorithm-comparison'));
    expect(res.status).toBe(200);
    const run = res.body.data.find((r) => r.runId === runId);
    expect(run).toBeDefined();
    expect(run.greedy.budgetUtilisationPct).toBeGreaterThanOrEqual(0);
    expect(run.ilp).not.toBeNull();
    expect(run.ilp.budgetUtilisationPct).toBeGreaterThanOrEqual(0);
  });

  it('returns budget utilisation over time', async () => {
    const { manager } = await seedReportData();
    const res = await manager(request(app).get('/api/v1/reports/budget-utilisation'));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('greedyUtilisationPct');
  });

  it('returns supplier performance for approved suppliers, reflecting the received PO', async () => {
    const { manager, supplierId } = await seedReportData();
    const res = await manager(request(app).get('/api/v1/reports/supplier-performance'));
    expect(res.status).toBe(200);
    const supplier = res.body.data.find((s) => s.supplierId === supplierId);
    expect(supplier).toBeDefined();
    expect(supplier.performanceScore).toBeGreaterThan(0);
  });

  it('returns the purchase order pipeline and lead time by supplier', async () => {
    const { manager, supplierId } = await seedReportData();
    const res = await manager(request(app).get('/api/v1/reports/po-pipeline'));
    expect(res.status).toBe(200);
    expect(res.body.data.pipeline.find((p) => p.status === 'received').count).toBeGreaterThanOrEqual(1);
    const supplierLeadTime = res.body.data.leadTimeBySupplier.find((s) => s.supplierId === supplierId);
    expect(supplierLeadTime).toBeDefined();
    expect(supplierLeadTime.avgLeadTimeDays).toBeGreaterThanOrEqual(0);
  });

  it('returns category spend reflecting the received purchase order', async () => {
    const { manager, categoryId } = await seedReportData();
    const res = await manager(request(app).get('/api/v1/reports/category-spend'));
    expect(res.status).toBe(200);
    const row = res.body.data.find((r) => r.categoryId === categoryId);
    expect(row).toBeDefined();
    expect(row.committedSpend).toBe(100);
    expect(row.receivedSpend).toBe(100);
  });

  it('rejects an invalid query parameter', async () => {
    const { manager } = await seedReportData();
    const res = await manager(request(app).get('/api/v1/reports/stock-turnover?days=-5'));
    expect(res.status).toBe(400);
  });

  it('filters budget utilisation and category spend by an open-ended date range', async () => {
    const { manager } = await seedReportData();

    const futureOnly = await manager(
      request(app).get(`/api/v1/reports/budget-utilisation?from=${new Date(Date.now() + 86400000).toISOString()}`),
    );
    expect(futureOnly.status).toBe(200);
    expect(futureOnly.body.data).toHaveLength(0);

    const upToNow = await manager(
      request(app).get(`/api/v1/reports/category-spend?to=${new Date(Date.now() + 86400000).toISOString()}`),
    );
    expect(upToNow.status).toBe(200);
    expect(upToNow.body.data.length).toBeGreaterThan(0);
  });

  it('reports a null ilp result for a run saved before the ILP allocator existed', async () => {
    const { manager } = await seedReportData();
    const manager2 = as(await loginAs('reports-manager-2@example.com', ROLES.INVENTORY_MANAGER));

    await GreedyRun.create({
      runBy: (await User.findOne({ email: 'reports-manager-2@example.com' }))._id,
      budget: 500,
      itemsConsidered: [],
      greedyResult: {
        allocations: [],
        totalAllocated: 100,
        unallocatedBudget: 400,
        itemsFullyCovered: 1,
        itemsPartiallyCovered: 0,
        itemsUncovered: 0,
        weightedUrgencyServed: 10,
      },
      proportionalResult: {
        allocations: [],
        totalAllocated: 100,
        unallocatedBudget: 400,
        itemsFullyCovered: 1,
        itemsPartiallyCovered: 0,
        itemsUncovered: 0,
        weightedUrgencyServed: 10,
      },
      // ilpResult intentionally omitted - simulates a run saved before ILP existed.
    });

    const comparison = await manager2(request(app).get('/api/v1/reports/algorithm-comparison'));
    const legacyRun = comparison.body.data.find((r) => r.budget === 500);
    expect(legacyRun.ilp).toBeNull();

    const utilisation = await manager2(request(app).get('/api/v1/reports/budget-utilisation'));
    const legacyPoint = utilisation.body.data.find((r) => r.budget === 500);
    expect(legacyPoint.ilpUtilisationPct).toBeNull();
  });
});
