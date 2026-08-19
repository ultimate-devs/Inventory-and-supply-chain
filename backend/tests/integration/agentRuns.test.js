import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../utils/testDb.js';
import { User } from '../../src/models/User.js';
import { ROLES } from '../../src/config/roles.js';

let app;
const originalFetch = global.fetch;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

afterEach(async () => {
  await clearTestDB();
  global.fetch = originalFetch;
});

afterAll(async () => {
  await disconnectTestDB();
});

const loginAs = async (role) => {
  const passwordHash = await User.hashPassword('SomePass1');
  await User.create({ name: 'Tester', email: `${role}@example.com`, passwordHash, role });
  const login = await request(app).post('/api/v1/auth/login').send({ email: `${role}@example.com`, password: 'SomePass1' });
  return login.body.data.accessToken;
};

describe('POST /agent-runs/:agentType', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/agent-runs/advisory').send({ message: 'hi' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown agent type', async () => {
    const token = await loginAs(ROLES.ANALYST);
    const res = await request(app)
      .post('/api/v1/agent-runs/not_a_real_agent')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'hi' });
    expect(res.status).toBe(400);
  });

  it('requires a message', async () => {
    const token = await loginAs(ROLES.ANALYST);
    const res = await request(app).post('/api/v1/agent-runs/advisory').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('lets any authenticated role trigger the advisory/analytics/monitoring agents and proxies the response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ summary: 'Reorder 40 units', log: { _id: 'log1', agentType: 'advisory' } }),
    });
    const token = await loginAs(ROLES.ANALYST);

    const res = await request(app)
      .post('/api/v1/agent-runs/advisory')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Suggest a reorder policy', action: 'reorder_suggestion' });

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe('Reorder 40 units');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('blocks a non-procurement role from triggering the procurement agent', async () => {
    const token = await loginAs(ROLES.ANALYST);
    const res = await request(app)
      .post('/api/v1/agent-runs/procurement')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Draft a PO' });
    expect(res.status).toBe(403);
  });

  it('allows a procurement officer to trigger the procurement agent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ summary: 'Drafted PO-1001', log: { _id: 'log2', agentType: 'procurement' } }),
    });
    const token = await loginAs(ROLES.PROCUREMENT_OFFICER);

    const res = await request(app)
      .post('/api/v1/agent-runs/procurement')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Draft a PO for this item' });

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe('Drafted PO-1001');
  });

  it('surfaces a 502 when the agents service cannot be reached', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const token = await loginAs(ROLES.SUPER_ADMIN);

    const res = await request(app)
      .post('/api/v1/agent-runs/monitoring')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Run a sweep' });

    expect(res.status).toBe(502);
  });
});
