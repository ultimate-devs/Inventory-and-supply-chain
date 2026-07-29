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

const loginAs = async (role) => {
  const passwordHash = await User.hashPassword('SettingsPass1');
  await User.create({ name: 'Settings User', email: `${role}@example.com`, passwordHash, role });
  const res = await request(app).post('/api/v1/auth/login').send({ email: `${role}@example.com`, password: 'SettingsPass1' });
  return res.body.data.accessToken;
};

describe('System settings', () => {
  it('returns default settings on first read (lazily created)', async () => {
    const token = await loginAs(ROLES.ANALYST);
    const res = await request(app).get('/api/v1/settings').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.currency).toBe('GBP');
  });

  it('forbids non-admins from updating settings', async () => {
    const token = await loginAs(ROLES.ANALYST);
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'Hacked Co' });
    expect(res.status).toBe(403);
  });

  it('allows a super admin to update settings', async () => {
    const token = await loginAs(ROLES.SUPER_ADMIN);
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'Acme Supply Co', excessStockMultiplier: 4, defaultServiceLevel: 99 });
    expect(res.status).toBe(200);
    expect(res.body.data.companyName).toBe('Acme Supply Co');
    expect(res.body.data.excessStockMultiplier).toBe(4);
    expect(res.body.data.defaultServiceLevel).toBe(99);
  });
});
