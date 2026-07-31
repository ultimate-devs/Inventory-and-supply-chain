import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../utils/testDb.js';
import { User } from '../../src/models/User.js';
import { ROLES } from '../../src/config/roles.js';

let app;
let procurementToken;
let managerToken;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

beforeEach(async () => {
  const procurementHash = await User.hashPassword('ProcurementPass1');
  await User.create({
    name: 'Procurement Officer',
    email: 'procurement@example.com',
    passwordHash: procurementHash,
    role: ROLES.PROCUREMENT_OFFICER,
  });
  const procurementLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'procurement@example.com', password: 'ProcurementPass1' });
  procurementToken = procurementLogin.body.data.accessToken;

  const managerHash = await User.hashPassword('ManagerPass1');
  await User.create({
    name: 'Inventory Manager',
    email: 'sup-manager@example.com',
    passwordHash: managerHash,
    role: ROLES.INVENTORY_MANAGER,
  });
  const managerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'sup-manager@example.com', password: 'ManagerPass1' });
  managerToken = managerLogin.body.data.accessToken;
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

const authed = (req) => req.set('Authorization', `Bearer ${procurementToken}`);
const asManager = (req) => req.set('Authorization', `Bearer ${managerToken}`);

const createCategoryAndItem = async () => {
  // Category/Item creation is restricted to Super Admin / Inventory Manager,
  // so this setup helper must use the manager token, not the procurement one.
  const category = await asManager(request(app).post('/api/v1/categories')).send({ name: 'Parts' });
  const item = await asManager(request(app).post('/api/v1/items')).send({
    name: 'Bolt',
    sku: 'BOLT-1',
    category: category.body.data._id,
    unitCost: 2,
  });
  return item.body.data._id;
};

describe('Supplier CRUD, status, catalogue, and recommendation', () => {
  it('creates a supplier defaulting to pending status', async () => {
    const res = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.performanceScore).toBe(100);
  });

  it('rejects duplicate supplier names', async () => {
    await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    const dup = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    expect(dup.status).toBe(409);
  });

  it('approves a pending supplier via the status endpoint', async () => {
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    const approve = await authed(request(app).patch(`/api/v1/suppliers/${create.body.data._id}/status`)).send({
      status: 'approved',
    });
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe('approved');
  });

  it('suspends an approved supplier, marking it inactive', async () => {
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    await authed(request(app).patch(`/api/v1/suppliers/${create.body.data._id}/status`)).send({ status: 'approved' });
    const suspend = await authed(request(app).patch(`/api/v1/suppliers/${create.body.data._id}/status`)).send({
      status: 'suspended',
    });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.status).toBe('suspended');
    expect(suspend.body.data.isActive).toBe(false);
  });

  it('adds a catalogue entry linking a supplier to an item with price and lead time', async () => {
    const itemId = await createCategoryAndItem();
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    const catalogue = await authed(request(app).post(`/api/v1/suppliers/${create.body.data._id}/catalogue`)).send({
      item: itemId,
      unitPrice: 1.5,
      leadTimeDays: 4,
    });
    expect(catalogue.status).toBe(200);
    expect(catalogue.body.data.itemsCatalogue).toHaveLength(1);
    expect(catalogue.body.data.itemsCatalogue[0].unitPrice).toBe(1.5);
  });

  it('recommends the best approved supplier for an item, excluding non-approved ones', async () => {
    const itemId = await createCategoryAndItem();

    const cheap = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Cheap Co' });
    await authed(request(app).patch(`/api/v1/suppliers/${cheap.body.data._id}/status`)).send({ status: 'approved' });
    await authed(request(app).post(`/api/v1/suppliers/${cheap.body.data._id}/catalogue`)).send({
      item: itemId,
      unitPrice: 1,
      leadTimeDays: 2,
    });

    const pending = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Pending Co' });
    await authed(request(app).post(`/api/v1/suppliers/${pending.body.data._id}/catalogue`)).send({
      item: itemId,
      unitPrice: 0.5,
      leadTimeDays: 1,
    });

    const recommend = await authed(request(app).get(`/api/v1/suppliers/recommend?item=${itemId}`));
    expect(recommend.status).toBe(200);
    expect(recommend.body.data.recommended.supplierId).toBe(cheap.body.data._id);
    expect(recommend.body.data.ranked).toHaveLength(1);
  });

  it('updates a supplier', async () => {
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    const update = await authed(request(app).put(`/api/v1/suppliers/${create.body.data._id}`)).send({
      contactName: 'Jane Doe',
      contactEmail: 'jane@acme.test',
    });
    expect(update.status).toBe(200);
    expect(update.body.data.contactName).toBe('Jane Doe');
    expect(update.body.data.contactEmail).toBe('jane@acme.test');
  });

  it('soft-deletes a supplier so it no longer appears in listings or lookups', async () => {
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    const del = await authed(request(app).delete(`/api/v1/suppliers/${create.body.data._id}`));
    expect(del.status).toBe(200);

    const getAfter = await authed(request(app).get(`/api/v1/suppliers/${create.body.data._id}`));
    expect(getAfter.status).toBe(404);

    const list = await authed(request(app).get('/api/v1/suppliers'));
    expect(list.body.data).toHaveLength(0);
  });

  it('removes a catalogue entry from a supplier', async () => {
    const itemId = await createCategoryAndItem();
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    await authed(request(app).post(`/api/v1/suppliers/${create.body.data._id}/catalogue`)).send({
      item: itemId,
      unitPrice: 1.5,
      leadTimeDays: 4,
    });

    const remove = await authed(request(app).delete(`/api/v1/suppliers/${create.body.data._id}/catalogue/${itemId}`));
    expect(remove.status).toBe(200);
    expect(remove.body.data.itemsCatalogue).toHaveLength(0);
  });

  it('lists only approved suppliers, ranked by performance score', async () => {
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    await authed(request(app).patch(`/api/v1/suppliers/${create.body.data._id}/status`)).send({ status: 'approved' });
    await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Still Pending' });

    const ranked = await authed(request(app).get('/api/v1/suppliers/ranked'));
    expect(ranked.status).toBe(200);
    expect(ranked.body.data).toHaveLength(1);
    expect(ranked.body.data[0].name).toBe('Acme Supplies');
  });

  it('returns 404 for a nonexistent supplier', async () => {
    const res = await authed(request(app).get('/api/v1/suppliers/64b000000000000000000000'));
    expect(res.status).toBe(404);
  });

  it('rejects an invalid status transition value', async () => {
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    const res = await authed(request(app).patch(`/api/v1/suppliers/${create.body.data._id}/status`)).send({
      status: 'not-a-real-status',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a catalogue entry referencing a nonexistent item', async () => {
    const create = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Acme Supplies' });
    const res = await authed(request(app).post(`/api/v1/suppliers/${create.body.data._id}/catalogue`)).send({
      item: '64b000000000000000000000',
      unitPrice: 1,
      leadTimeDays: 1,
    });
    expect(res.status).toBe(400);
  });

  it('filters suppliers by status and search text', async () => {
    const a = await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Approved Alpha' });
    await authed(request(app).patch(`/api/v1/suppliers/${a.body.data._id}/status`)).send({ status: 'approved' });
    await authed(request(app).post('/api/v1/suppliers')).send({ name: 'Pending Beta' });

    const byStatus = await authed(request(app).get('/api/v1/suppliers?status=approved'));
    expect(byStatus.body.data).toHaveLength(1);
    expect(byStatus.body.data[0].name).toBe('Approved Alpha');

    const bySearch = await authed(request(app).get('/api/v1/suppliers?search=beta'));
    expect(bySearch.body.data).toHaveLength(1);
    expect(bySearch.body.data[0].name).toBe('Pending Beta');
  });
});
