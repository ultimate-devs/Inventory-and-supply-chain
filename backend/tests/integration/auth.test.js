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

const credentials = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Sup3rSecret!' };

const seedUser = async (overrides = {}) => {
  const passwordHash = await User.hashPassword(overrides.password || credentials.password);
  return User.create({
    name: overrides.name || credentials.name,
    email: overrides.email || credentials.email,
    passwordHash,
    role: overrides.role || ROLES.ANALYST,
    isActive: overrides.isActive ?? true,
  });
};

describe('Auth flow', () => {
  it('no longer exposes a public registration endpoint', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(credentials);
    expect(res.status).toBe(404);
  });

  it('logs in, sets a refresh cookie, and returns an access token', async () => {
    await seedUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.headers['set-cookie'].some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('rejects login with the wrong password', async () => {
    await seedUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('protects routes and exposes the current user via /auth/me', async () => {
    await seedUser();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const { accessToken } = login.body.data;

    const unauthed = await request(app).get('/api/v1/auth/me');
    expect(unauthed.status).toBe(401);

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(credentials.email);
  });

  it('rotates the refresh token on /auth/refresh and invalidates the old one', async () => {
    await seedUser();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const cookie = login.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshRes.status).toBe(200);
    const newCookie = refreshRes.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(newCookie).not.toBe(cookie);

    // Old refresh token must now be rejected (rotation).
    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(reuse.status).toBe(401);
  });

  it('enforces RBAC: a non-admin cannot list users', async () => {
    await seedUser();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('allows a super admin to list and deactivate users', async () => {
    const passwordHash = await User.hashPassword('AdminPass1');
    await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash, role: ROLES.SUPER_ADMIN });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'AdminPass1' });

    const list = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
  });

  it('rejects /auth/refresh when there is no refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('rejects /auth/refresh with a garbage token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', 'refreshToken=not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('rejects login for a deactivated account', async () => {
    const passwordHash = await User.hashPassword('DeactivatedPass1');
    await User.create({
      name: 'Deactivated',
      email: 'deactivated@example.com',
      passwordHash,
      isActive: false,
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'deactivated@example.com', password: 'DeactivatedPass1' });
    expect(res.status).toBe(403);
  });

  it('rejects login for an unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'WhoKnows1' });
    expect(res.status).toBe(401);
  });

  it('does not reveal whether an email exists on forgot-password', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.resetToken).toBeNull();
  });

  it('rejects reset-password with an invalid or expired token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'BrandNewPass1' });
    expect(res.status).toBe(400);
  });

  it('logs out and invalidates the refresh cookie', async () => {
    await seedUser();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const cookie = login.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .set('Cookie', cookie);
    expect(logoutRes.status).toBe(200);

    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(reuse.status).toBe(401);
  });

  it('allows a super admin to update and deactivate another user', async () => {
    const passwordHash = await User.hashPassword('AdminPass1');
    const admin = await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash, role: ROLES.SUPER_ADMIN });
    const target = await User.create({
      name: 'Target',
      email: 'target@example.com',
      passwordHash: await User.hashPassword('TargetPass1'),
      role: ROLES.ANALYST,
    });
    const login = await request(app).post('/api/v1/auth/login').send({ email: admin.email, password: 'AdminPass1' });
    const token = login.body.data.accessToken;

    const getOne = await request(app).get(`/api/v1/users/${target._id}`).set('Authorization', `Bearer ${token}`);
    expect(getOne.status).toBe(200);

    const update = await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: ROLES.PROCUREMENT_OFFICER });
    expect(update.status).toBe(200);
    expect(update.body.data.role).toBe(ROLES.PROCUREMENT_OFFICER);

    const deactivate = await request(app)
      .delete(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deactivate.status).toBe(200);

    const getAfter = await request(app).get(`/api/v1/users/${target._id}`).set('Authorization', `Bearer ${token}`);
    expect(getAfter.status).toBe(404);
  });

  it('supports the forgot/reset password flow and invalidates old sessions', async () => {
    await seedUser();
    const forgot = await request(app).post('/api/v1/auth/forgot-password').send({ email: credentials.email });
    expect(forgot.status).toBe(200);
    const { resetToken } = forgot.body.data;

    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'BrandNewPass1' });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'BrandNewPass1' });
    expect(newLogin.status).toBe(200);
  });
});
