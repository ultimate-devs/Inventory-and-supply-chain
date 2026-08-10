import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../utils/testDb.js';
import { User } from '../../src/models/User.js';
import { ROLES } from '../../src/config/roles.js';

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

/**
 * Creates a User the way seedServiceAgents.js does (isServiceAccount: true)
 * and logs in through the same POST /auth/login every client uses - the ADK
 * agents/ service authenticates no differently than this.
 */
const loginAsServiceAccount = async (email, role) => {
  const password = 'ServiceAccountPass1';
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name: 'Agents Service', email, passwordHash, role, isServiceAccount: true });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: res.body.data.accessToken, userId: user._id.toString() };
};

const loginAsHuman = async (email, role) => {
  const password = 'HumanPass1';
  const passwordHash = await User.hashPassword(password);
  await User.create({ name: 'Human', email, passwordHash, role });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data.accessToken;
};

const as = (token) => (req) => req.set('Authorization', `Bearer ${token}`);

describe('Agent-log service-account flow', () => {
  it('logs in a service account exactly like any other user, distinguished by isServiceAccount', async () => {
    const { token } = await loginAsServiceAccount('agents-readonly@internal.local', ROLES.ANALYST);
    const res = await as(token)(request(app).get('/api/v1/auth/me'));
    expect(res.status).toBe(200);
    expect(res.body.data.isServiceAccount).toBe(true);
  });

  it('lets the read-only service account (ANALYST) record and list agent logs', async () => {
    const { token } = await loginAsServiceAccount('agents-readonly@internal.local', ROLES.ANALYST);
    const analyst = as(token);

    const create = await analyst(request(app).post('/api/v1/agent-logs')).send({
      agentType: 'analytics',
      action: 'stock_turnover_review',
      summary: 'Three items are turning over unusually slowly this quarter.',
      triggeredBy: 'cron',
    });
    expect(create.status).toBe(201);
    expect(create.body.data.agentType).toBe('analytics');

    const list = await analyst(request(app).get('/api/v1/agent-logs'));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].createdBy.isServiceAccount).toBe(true);

    const filtered = await analyst(request(app).get('/api/v1/agent-logs?agentType=procurement'));
    expect(filtered.body.data).toHaveLength(0);
  });

  it('links an agent log back to the specific record it is about', async () => {
    const { token } = await loginAsServiceAccount('agents-procurement@internal.local', ROLES.PROCUREMENT_OFFICER);
    const procurementAgent = as(token);
    const fakePoId = '65f000000000000000000000';

    const create = await procurementAgent(request(app).post('/api/v1/agent-logs')).send({
      agentType: 'procurement',
      action: 'draft_po_created',
      summary: 'Drafted a purchase order for the recommended supplier.',
      relatedModel: 'PurchaseOrder',
      relatedId: fakePoId,
      triggeredBy: 'manual',
    });
    expect(create.status).toBe(201);
    expect(create.body.data.relatedModel).toBe('PurchaseOrder');
    expect(create.body.data.relatedId).toBe(fakePoId);
  });

  it('rejects a human role without agent-log write access', async () => {
    const token = await loginAsHuman('manager@example.com', ROLES.INVENTORY_MANAGER);
    const res = await as(token)(request(app).post('/api/v1/agent-logs')).send({
      agentType: 'monitoring',
      action: 'x',
      summary: 'x',
      triggeredBy: 'manual',
    });
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/agent-logs');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid agentType or triggeredBy', async () => {
    const { token } = await loginAsServiceAccount('agents-readonly@internal.local', ROLES.ANALYST);
    const res = await as(token)(request(app).post('/api/v1/agent-logs')).send({
      agentType: 'not-a-real-agent',
      action: 'x',
      summary: 'x',
      triggeredBy: 'cron',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /algorithms/rop-eoq-scenario', () => {
  it('computes ROP/EOQ for arbitrary what-if inputs without requiring a saved item', async () => {
    const { token } = await loginAsServiceAccount('agents-readonly@internal.local', ROLES.ANALYST);
    const res = await as(token)(request(app).post('/api/v1/algorithms/rop-eoq-scenario')).send({
      avgDailyDemand: 12,
      leadTimeDays: 6,
      demandStdDev: 3,
      safetyStock: 15,
      serviceLevel: 95,
      orderingCost: 40,
      holdingCostPerUnit: 1.5,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.reorderPointSimple).toBe(12 * 6 + 15);
    expect(res.body.data.economicOrderQuantity).toBeGreaterThan(0);
  });

  it('rejects a negative avgDailyDemand', async () => {
    const { token } = await loginAsServiceAccount('agents-readonly@internal.local', ROLES.ANALYST);
    const res = await as(token)(request(app).post('/api/v1/algorithms/rop-eoq-scenario')).send({
      avgDailyDemand: -5,
      leadTimeDays: 6,
    });
    expect(res.status).toBe(400);
  });
});
