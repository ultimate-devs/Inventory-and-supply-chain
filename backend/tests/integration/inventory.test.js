import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../utils/testDb.js';
import { User } from '../../src/models/User.js';
import { ROLES } from '../../src/config/roles.js';

let app;
let managerToken;

const registerAndLoginManager = async () => {
  const passwordHash = await User.hashPassword('ManagerPass1');
  await User.create({
    name: 'Inventory Manager',
    email: 'manager@example.com',
    passwordHash,
    role: ROLES.INVENTORY_MANAGER,
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'manager@example.com', password: 'ManagerPass1' });
  return login.body.data.accessToken;
};

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

beforeEach(async () => {
  managerToken = await registerAndLoginManager();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

const authed = (req) => req.set('Authorization', `Bearer ${managerToken}`);

describe('Category CRUD', () => {
  it('creates, lists, updates, and soft-deletes a category', async () => {
    const create = await authed(request(app).post('/api/v1/categories')).send({ name: 'Electronics' });
    expect(create.status).toBe(201);
    const categoryId = create.body.data._id;

    const list = await authed(request(app).get('/api/v1/categories'));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);

    const update = await authed(request(app).put(`/api/v1/categories/${categoryId}`)).send({
      description: 'Consumer electronics',
    });
    expect(update.status).toBe(200);
    expect(update.body.data.description).toBe('Consumer electronics');

    const del = await authed(request(app).delete(`/api/v1/categories/${categoryId}`));
    expect(del.status).toBe(200);

    const listAfter = await authed(request(app).get('/api/v1/categories'));
    expect(listAfter.body.data).toHaveLength(0);
  });

  it('rejects duplicate category names', async () => {
    await authed(request(app).post('/api/v1/categories')).send({ name: 'Electronics' });
    const dup = await authed(request(app).post('/api/v1/categories')).send({ name: 'Electronics' });
    expect(dup.status).toBe(409);
  });
});

describe('Item CRUD and computed metrics', () => {
  const createCategory = async () => {
    const res = await authed(request(app).post('/api/v1/categories')).send({ name: 'Widgets' });
    return res.body.data._id;
  };

  it('computes ROP/EOQ/stock status immediately on item creation', async () => {
    const categoryId = await createCategory();

    const res = await authed(request(app).post('/api/v1/items')).send({
      name: 'Widget A',
      sku: 'WID-A',
      category: categoryId,
      unitCost: 5,
      currentStock: 20,
      leadTimeDays: 7,
      orderingCost: 25,
      holdingCostPerUnit: 1.5,
      safetyStock: 10,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.stockStatus).toBeDefined();
    expect(res.body.data.lastCalculatedAt).toBeTruthy();
    // No demand history yet -> avg demand 0 -> ROP is driven by safetyStock alone (10);
    // 20 is above ROP(10) but not above the excess threshold (10*3=30) -> OK.
    expect(res.body.data.stockStatus).toBe('ok');
  });

  it('rejects creating an item against a nonexistent category', async () => {
    const res = await authed(request(app).post('/api/v1/items')).send({
      name: 'Widget B',
      sku: 'WID-B',
      category: '64b000000000000000000000',
      unitCost: 5,
    });
    expect(res.status).toBe(400);
  });

  it('rejects creating an item with a duplicate SKU', async () => {
    const categoryId = await createCategory();
    const payload = { name: 'Widget C', sku: 'WID-C', category: categoryId, unitCost: 5 };
    await authed(request(app).post('/api/v1/items')).send(payload);
    const dup = await authed(request(app).post('/api/v1/items')).send(payload);
    expect(dup.status).toBe(409);
  });

  it('blocks deleting a category that still has items assigned', async () => {
    const categoryId = await createCategory();
    await authed(request(app).post('/api/v1/items')).send({
      name: 'Widget D',
      sku: 'WID-D',
      category: categoryId,
      unitCost: 5,
    });
    const del = await authed(request(app).delete(`/api/v1/categories/${categoryId}`));
    expect(del.status).toBe(409);
  });

  it('updates an item, including moving it to a different category', async () => {
    const categoryId = await createCategory();
    const otherCategory = await authed(request(app).post('/api/v1/categories')).send({ name: 'Gadgets' });
    const item = await authed(request(app).post('/api/v1/items')).send({
      name: 'Widget E',
      sku: 'WID-E',
      category: categoryId,
      unitCost: 5,
    });

    const update = await authed(request(app).put(`/api/v1/items/${item.body.data._id}`)).send({
      name: 'Widget E2',
      category: otherCategory.body.data._id,
      unitCost: 7.5,
    });

    expect(update.status).toBe(200);
    expect(update.body.data.name).toBe('Widget E2');
    expect(update.body.data.unitCost).toBe(7.5);
  });

  it('rejects moving an item to a nonexistent category', async () => {
    const categoryId = await createCategory();
    const item = await authed(request(app).post('/api/v1/items')).send({
      name: 'Widget F',
      sku: 'WID-F',
      category: categoryId,
      unitCost: 5,
    });

    const update = await authed(request(app).put(`/api/v1/items/${item.body.data._id}`)).send({
      category: '64b000000000000000000000',
    });
    expect(update.status).toBe(400);
  });

  it('returns 404 when updating a nonexistent item', async () => {
    const update = await authed(request(app).put('/api/v1/items/64b000000000000000000000')).send({
      name: 'Ghost',
    });
    expect(update.status).toBe(404);
  });

  it('soft-deletes an item so it no longer appears in listings or lookups', async () => {
    const categoryId = await createCategory();
    const item = await authed(request(app).post('/api/v1/items')).send({
      name: 'Widget G',
      sku: 'WID-G',
      category: categoryId,
      unitCost: 5,
    });

    const del = await authed(request(app).delete(`/api/v1/items/${item.body.data._id}`));
    expect(del.status).toBe(200);

    const getAfter = await authed(request(app).get(`/api/v1/items/${item.body.data._id}`));
    expect(getAfter.status).toBe(404);
  });

  it('returns 404 deleting a nonexistent item', async () => {
    const del = await authed(request(app).delete('/api/v1/items/64b000000000000000000000'));
    expect(del.status).toBe(404);
  });

  it('filters items by category, stockStatus, and search text, and supports sorting', async () => {
    const categoryId = await createCategory();
    await authed(request(app).post('/api/v1/items')).send({
      name: 'Alpha Widget',
      sku: 'ALPHA-1',
      category: categoryId,
      unitCost: 5,
      currentStock: 5,
      safetyStock: 10, // -> critical
    });
    await authed(request(app).post('/api/v1/items')).send({
      name: 'Beta Widget',
      sku: 'BETA-1',
      category: categoryId,
      unitCost: 5,
      currentStock: 500,
      safetyStock: 0, // -> ok/excess depending on ROP, but definitely not critical
    });

    const byCategory = await authed(request(app).get(`/api/v1/items?category=${categoryId}`));
    expect(byCategory.body.data).toHaveLength(2);

    const byStatus = await authed(request(app).get('/api/v1/items?stockStatus=critical'));
    expect(byStatus.body.data).toHaveLength(1);
    expect(byStatus.body.data[0].name).toBe('Alpha Widget');

    const bySearch = await authed(request(app).get('/api/v1/items?search=beta'));
    expect(bySearch.body.data).toHaveLength(1);
    expect(bySearch.body.data[0].sku).toBe('BETA-1');

    const sortedDesc = await authed(
      request(app).get('/api/v1/items?sortBy=currentStock&sortOrder=desc'),
    );
    expect(sortedDesc.body.data[0].sku).toBe('BETA-1');
  });
});

describe('Stock movements (transactional)', () => {
  const createCategoryAndItem = async () => {
    const category = await authed(request(app).post('/api/v1/categories')).send({ name: 'Tools' });
    const item = await authed(request(app).post('/api/v1/items')).send({
      name: 'Hammer',
      sku: 'HAM-1',
      category: category.body.data._id,
      unitCost: 10,
      currentStock: 20,
      leadTimeDays: 5,
      orderingCost: 30,
      holdingCostPerUnit: 2,
      safetyStock: 5,
    });
    return item.body.data._id;
  };

  it('increases stock and logs an IN movement', async () => {
    const itemId = await createCategoryAndItem();
    const res = await authed(request(app).post(`/api/v1/items/${itemId}/movements`)).send({
      type: 'in',
      quantity: 15,
      reason: 'Received PO #1',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.item.currentStock).toBe(35);
    expect(res.body.data.movement.resultingStock).toBe(35);

    const movements = await authed(request(app).get(`/api/v1/items/${itemId}/movements`));
    expect(movements.body.data).toHaveLength(1);
  });

  it('decreases stock and re-triggers status recalculation', async () => {
    const itemId = await createCategoryAndItem();
    const res = await authed(request(app).post(`/api/v1/items/${itemId}/movements`)).send({
      type: 'out',
      quantity: 16,
      reason: 'Shipped order #9',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.item.currentStock).toBe(4);
    // 4 <= safetyStock(5) -> critical
    expect(res.body.data.item.stockStatus).toBe('critical');
  });

  it('rejects an OUT movement that would drive stock negative, leaving stock unchanged', async () => {
    const itemId = await createCategoryAndItem();
    const res = await authed(request(app).post(`/api/v1/items/${itemId}/movements`)).send({
      type: 'out',
      quantity: 999,
    });
    expect(res.status).toBe(400);

    const item = await authed(request(app).get(`/api/v1/items/${itemId}`));
    expect(item.body.data.currentStock).toBe(20);

    const movements = await authed(request(app).get(`/api/v1/items/${itemId}/movements`));
    expect(movements.body.data).toHaveLength(0);
  });
});
