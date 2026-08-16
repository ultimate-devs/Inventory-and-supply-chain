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

const seedAdmin = async () => {
  const passwordHash = await User.hashPassword('AdminPass1');
  await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash, role: ROLES.SUPER_ADMIN });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@example.com', password: 'AdminPass1' });
  return login.body.data.accessToken;
};

describe('Admin-created users and forced password change', () => {
  it('creates a user with a generated temp password and no plaintext password accepted from the caller', async () => {
    const adminToken = await seedAdmin();
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Hire', email: 'newhire@example.com', role: ROLES.ANALYST, password: 'IgnoreMe1' });

    expect(res.status).toBe(201);
    expect(res.body.data.mustChangePassword).toBe(true);
    expect(res.body.data.tempPassword).toEqual(expect.any(String));
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('lets the new user log in with the temp password but blocks every route except the change-password/logout/me allowlist', async () => {
    const adminToken = await seedAdmin();
    const create = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Hire', email: 'newhire@example.com', role: ROLES.ANALYST });
    const { tempPassword } = create.body.data;

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'newhire@example.com', password: tempPassword });
    expect(login.status).toBe(200);
    expect(login.body.data.user.mustChangePassword).toBe(true);
    const token = login.body.data.accessToken;

    const blocked = await request(app).get('/api/v1/items').set('Authorization', `Bearer ${token}`);
    expect(blocked.status).toBe(403);

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
  });

  it('allows continued use after the user changes their password via /auth/change-password', async () => {
    const adminToken = await seedAdmin();
    const create = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Hire', email: 'newhire@example.com', role: ROLES.ANALYST });
    const { tempPassword } = create.body.data;

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'newhire@example.com', password: tempPassword });
    const token = login.body.data.accessToken;

    const wrongCurrent = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'NotIt1', newPassword: 'BrandNewPass1' });
    expect(wrongCurrent.status).toBe(401);

    const change = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: tempPassword, newPassword: 'BrandNewPass1' });
    expect(change.status).toBe(200);
    expect(change.body.data.mustChangePassword).toBe(false);

    const unblocked = await request(app).get('/api/v1/items').set('Authorization', `Bearer ${token}`);
    expect(unblocked.status).toBe(200);

    const reLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'newhire@example.com', password: 'BrandNewPass1' });
    expect(reLogin.status).toBe(200);
  });

  it('rejects login once the temp password has expired', async () => {
    const passwordHash = await User.hashPassword('ExpiredTemp1');
    await User.create({
      name: 'Stale Invite',
      email: 'stale@example.com',
      passwordHash,
      mustChangePassword: true,
      tempPasswordExpires: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'stale@example.com', password: 'ExpiredTemp1' });
    expect(res.status).toBe(401);
  });

  it('lets a super admin resend a temp password via reset-password', async () => {
    const adminToken = await seedAdmin();
    const create = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Hire', email: 'newhire@example.com', role: ROLES.ANALYST });
    const target = create.body.data.id;
    const oldTempPassword = create.body.data.tempPassword;

    const reset = await request(app)
      .post(`/api/v1/users/${target}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reset.status).toBe(200);
    const newTempPassword = reset.body.data.tempPassword;
    expect(newTempPassword).not.toBe(oldTempPassword);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'newhire@example.com', password: oldTempPassword });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'newhire@example.com', password: newTempPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data.user.mustChangePassword).toBe(true);
  });
});
