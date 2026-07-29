import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../utils/testDb.js';
import { User } from '../../src/models/User.js';
import { ROLES } from '../../src/config/roles.js';

let app;
let token;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

beforeEach(async () => {
  const passwordHash = await User.hashPassword('DashPass1');
  await User.create({ name: 'Manager', email: 'manager@example.com', passwordHash, role: ROLES.INVENTORY_MANAGER });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'manager@example.com', password: 'DashPass1' });
  token = login.body.data.accessToken;
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

const authed = (req) => req.set('Authorization', `Bearer ${token}`);

describe('GET /api/v1/dashboard', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns zeroed KPIs when there is no inventory yet', async () => {
    const res = await authed(request(app).get('/api/v1/dashboard'));
    expect(res.status).toBe(200);
    expect(res.body.data.kpis).toEqual({
      totalItems: 0,
      totalInventoryValue: 0,
      criticalItemCount: 0,
      lowItemCount: 0,
      excessItemCount: 0,
      pendingOrders: 0,
    });
    expect(res.body.data.stockVsReorderByCategory).toEqual([]);
    expect(res.body.data.criticalItems).toEqual([]);
  });

  it('aggregates real KPIs, category breakdown, critical items, and recent activity', async () => {
    const category = await authed(request(app).post('/api/v1/categories')).send({ name: 'Electronics' });
    const categoryId = category.body.data._id;

    // Healthy item: well above its reorder point.
    await authed(request(app).post('/api/v1/items')).send({
      name: 'Headphones',
      sku: 'HP-1',
      category: categoryId,
      unitCost: 20,
      currentStock: 200,
      safetyStock: 0,
    });

    // Critical item: at or below safety stock.
    await authed(request(app).post('/api/v1/items')).send({
      name: 'Charger',
      sku: 'CH-1',
      category: categoryId,
      unitCost: 5,
      currentStock: 2,
      safetyStock: 10,
    });

    const res = await authed(request(app).get('/api/v1/dashboard'));
    expect(res.status).toBe(200);

    expect(res.body.data.kpis.totalItems).toBe(2);
    expect(res.body.data.kpis.totalInventoryValue).toBe(200 * 20 + 2 * 5);
    expect(res.body.data.kpis.criticalItemCount).toBe(1);

    expect(res.body.data.stockVsReorderByCategory).toHaveLength(1);
    expect(res.body.data.stockVsReorderByCategory[0].categoryName).toBe('Electronics');
    expect(res.body.data.stockVsReorderByCategory[0].itemCount).toBe(2);

    expect(res.body.data.criticalItems).toHaveLength(1);
    expect(res.body.data.criticalItems[0].sku).toBe('CH-1');

    // Category + 2 items = 3 mutating requests, all audit-logged.
    expect(res.body.data.recentActivity.length).toBeGreaterThanOrEqual(3);
  });

  it('excludes soft-deleted items from KPIs and category breakdown', async () => {
    const category = await authed(request(app).post('/api/v1/categories')).send({ name: 'Books' });
    const item = await authed(request(app).post('/api/v1/items')).send({
      name: 'Novel',
      sku: 'BK-1',
      category: category.body.data._id,
      unitCost: 10,
      currentStock: 50,
    });

    await authed(request(app).delete(`/api/v1/items/${item.body.data._id}`));

    const res = await authed(request(app).get('/api/v1/dashboard'));
    expect(res.body.data.kpis.totalItems).toBe(0);
    expect(res.body.data.stockVsReorderByCategory).toEqual([]);
  });
});
