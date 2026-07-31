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
  const passwordHash = await User.hashPassword('ManagerPass1');
  await User.create({ name: 'Manager', email: 'algo-manager@example.com', passwordHash, role: ROLES.INVENTORY_MANAGER });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'algo-manager@example.com', password: 'ManagerPass1' });
  token = login.body.data.accessToken;
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

const authed = (req) => req.set('Authorization', `Bearer ${token}`);

const createLowStockItem = async (name, sku, unitCost, currentStock) => {
  const category = await authed(request(app).post('/api/v1/categories')).send({ name: `Cat-${sku}` });
  await authed(request(app).post('/api/v1/items')).send({
    name,
    sku,
    category: category.body.data._id,
    unitCost,
    currentStock,
    safetyStock: 50,
    leadTimeDays: 5,
  });
};

describe('Greedy vs Proportional algorithm comparison', () => {
  it('produces visibly different results for real low-stock items and saves the run to history', async () => {
    await createLowStockItem('Critical Widget', 'CRIT-1', 10, 0);
    await createLowStockItem('Mild Widget', 'MILD-1', 10, 40);

    const candidates = await authed(request(app).get('/api/v1/algorithms/candidates'));
    expect(candidates.status).toBe(200);
    expect(candidates.body.data.length).toBeGreaterThanOrEqual(2);

    const compare = await authed(request(app).post('/api/v1/algorithms/compare')).send({ budget: 300 });
    expect(compare.status).toBe(201);
    expect(compare.body.data.run.greedyResult.allocations.length).toBe(candidates.body.data.length);
    expect(compare.body.data.run.proportionalResult.allocations.length).toBe(candidates.body.data.length);

    const history = await authed(request(app).get('/api/v1/algorithms/runs'));
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);

    const single = await authed(request(app).get(`/api/v1/algorithms/runs/${compare.body.data.run._id}`));
    expect(single.status).toBe(200);
    expect(single.body.data._id).toBe(compare.body.data.run._id);
  });

  it('rejects a negative budget', async () => {
    const res = await authed(request(app).post('/api/v1/algorithms/compare')).send({ budget: -10 });
    expect(res.status).toBe(400);
  });
});

describe('Alert acknowledgement and resolution', () => {
  it('acknowledges then resolves an alert raised by a critical-stock item', async () => {
    await createLowStockItem('Alert Widget', 'ALERT-1', 5, 0);

    const openAlerts = await authed(request(app).get('/api/v1/alerts?status=open'));
    expect(openAlerts.body.data.length).toBeGreaterThanOrEqual(1);
    const alertId = openAlerts.body.data[0]._id;

    const unread = await authed(request(app).get('/api/v1/alerts/unread-count'));
    expect(unread.body.data.count).toBeGreaterThanOrEqual(1);

    const ack = await authed(request(app).post(`/api/v1/alerts/${alertId}/acknowledge`));
    expect(ack.status).toBe(200);
    expect(ack.body.data.status).toBe('acknowledged');

    const resolve = await authed(request(app).post(`/api/v1/alerts/${alertId}/resolve`));
    expect(resolve.status).toBe(200);
    expect(resolve.body.data.status).toBe('resolved');
  });
});
