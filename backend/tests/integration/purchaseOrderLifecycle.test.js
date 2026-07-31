import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../utils/testDb.js';
import { User } from '../../src/models/User.js';
import { ROLES } from '../../src/config/roles.js';
import { PurchaseOrder } from '../../src/models/PurchaseOrder.js';
import { Alert } from '../../src/models/Alert.js';
import { flagOverduePurchaseOrders } from '../../src/services/purchaseOrderService.js';

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
  const passwordHash = await User.hashPassword('LifecyclePass1');
  await User.create({ name: email, email, passwordHash, role });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'LifecyclePass1' });
  return res.body.data.accessToken;
};

const as = (token) => (req) => req.set('Authorization', `Bearer ${token}`);

const setupSupplierAndItem = async (procurement, manager, { unitPrice = 2, currentStock = 5, safetyStock = 10 } = {}) => {
  // Category/Item creation is restricted to Super Admin / Inventory Manager,
  // so this setup helper needs the manager token for those two calls.
  const category = await manager(request(app).post('/api/v1/categories')).send({ name: 'Hardware' });
  const item = await manager(request(app).post('/api/v1/items')).send({
    name: 'Steel Bracket',
    sku: 'BRK-1',
    category: category.body.data._id,
    unitCost: unitPrice,
    currentStock,
    safetyStock,
    leadTimeDays: 5,
  });
  const supplier = await procurement(request(app).post('/api/v1/suppliers')).send({ name: 'Bracket Supplier' });
  await procurement(request(app).patch(`/api/v1/suppliers/${supplier.body.data._id}/status`)).send({
    status: 'approved',
  });
  await procurement(request(app).post(`/api/v1/suppliers/${supplier.body.data._id}/catalogue`)).send({
    item: item.body.data._id,
    unitPrice,
    leadTimeDays: 5,
  });
  return { itemId: item.body.data._id, supplierId: supplier.body.data._id };
};

describe('Purchase order full lifecycle: create -> approve -> send -> receive -> stock update', () => {
  it('takes a single-approval PO from draft through to received stock and a recalculated supplier score', async () => {
    const procurementToken = await loginAs('po1-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po1-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);

    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager, { unitPrice: 2, currentStock: 5 });

    const itemBefore = await procurement(request(app).get(`/api/v1/items/${itemId}`));
    expect(itemBefore.body.data.stockStatus).toBe('critical');

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 10, unitPrice: 2 }],
      expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe('draft');
    expect(create.body.data.totalAmount).toBe(20);
    const poId = create.body.data._id;

    const submit = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({
      version: 0,
    });
    expect(submit.status).toBe(200);
    expect(submit.body.data.status).toBe('submitted');
    expect(submit.body.data.requiresSecondApproval).toBe(false);

    const approve = await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe('approved');

    const send = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({ version: 2 });
    expect(send.status).toBe(200);
    expect(send.body.data.status).toBe('sent');

    const receive = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/receive`)).send({
      version: 3,
      lines: [{ item: itemId, receivedQuantity: 10 }],
    });
    expect(receive.status).toBe(200);
    expect(receive.body.data.purchaseOrder.status).toBe('received');
    expect(receive.body.data.supplier.performanceScore).toBeGreaterThan(0);
    expect(receive.body.data.supplier.stats.totalDeliveries).toBe(1);
    expect(receive.body.data.supplier.stats.onTimeDeliveries).toBe(1);

    const itemAfter = await procurement(request(app).get(`/api/v1/items/${itemId}`));
    expect(itemAfter.body.data.currentStock).toBe(15);
    // 15 > safetyStock(10) -> alert should now be resolved rather than open.
    expect(itemAfter.body.data.stockStatus).not.toBe('critical');

    const openAlerts = await procurement(request(app).get('/api/v1/alerts?status=open'));
    expect(openAlerts.body.data.find((a) => a.item?._id === itemId)).toBeUndefined();
  });

  it('rejects an optimistic-locking conflict when the version is stale', async () => {
    const procurementToken = await loginAs('po2-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po2-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });
    const poId = create.body.data._id;

    const staleSubmit = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({
      version: 99,
    });
    expect(staleSubmit.status).toBe(409);
  });

  it('requires two different approvers for a purchase order above the approval threshold', async () => {
    const procurementToken = await loginAs('po3-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerAToken = await loginAs('po3-managerA@example.com', ROLES.INVENTORY_MANAGER);
    const managerBToken = await loginAs('po3-managerB@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const managerA = as(managerAToken);
    const managerB = as(managerBToken);

    const { itemId, supplierId } = await setupSupplierAndItem(procurement, managerA, { unitPrice: 100, currentStock: 500 });

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 100, unitPrice: 100 }],
    });
    expect(create.body.data.totalAmount).toBe(10000);
    const poId = create.body.data._id;

    const submit = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({
      version: 0,
    });
    expect(submit.body.data.requiresSecondApproval).toBe(true);

    const firstApproval = await managerA(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({
      version: 1,
    });
    expect(firstApproval.status).toBe(200);
    expect(firstApproval.body.data.status).toBe('submitted');
    expect(firstApproval.body.data.approvals).toHaveLength(1);

    const sameApproverAgain = await managerA(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({
      version: 2,
    });
    expect(sameApproverAgain.status).toBe(400);

    const secondApproval = await managerB(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({
      version: 2,
    });
    expect(secondApproval.status).toBe(200);
    expect(secondApproval.body.data.status).toBe('approved');
    expect(secondApproval.body.data.approvals).toHaveLength(2);
  });

  it('handles a partial under-delivery followed by the remainder, and detects an over-delivery', async () => {
    const procurementToken = await loginAs('po4-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po4-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);

    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager, { currentStock: 100, safetyStock: 5 });

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 10, unitPrice: 2 }],
    });
    const poId = create.body.data._id;

    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });
    await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({ version: 2 });

    const partial = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/receive`)).send({
      version: 3,
      lines: [{ item: itemId, receivedQuantity: 6 }],
    });
    expect(partial.status).toBe(200);
    expect(partial.body.data.purchaseOrder.status).toBe('partially_received');
    expect(partial.body.data.purchaseOrder.discrepancies).toHaveLength(1);
    expect(partial.body.data.purchaseOrder.discrepancies[0].type).toBe('under_delivery');
    // Score is only recalculated once the PO is fully received.
    expect(partial.body.data.supplier).toBeNull();

    const complete = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/receive`)).send({
      version: 4,
      lines: [{ item: itemId, receivedQuantity: 4 }],
    });
    expect(complete.status).toBe(200);
    expect(complete.body.data.purchaseOrder.status).toBe('received');
    expect(complete.body.data.supplier.performanceScore).toBeGreaterThan(0);
  });

  it('flags an over-delivery as a discrepancy while still marking the PO received', async () => {
    const procurementToken = await loginAs('po5-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po5-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);

    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager, { currentStock: 100, safetyStock: 5 });

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 10, unitPrice: 2 }],
    });
    const poId = create.body.data._id;

    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });
    await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({ version: 2 });

    const receive = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/receive`)).send({
      version: 3,
      lines: [{ item: itemId, receivedQuantity: 12 }],
    });
    expect(receive.status).toBe(200);
    expect(receive.body.data.purchaseOrder.status).toBe('received');
    expect(receive.body.data.purchaseOrder.discrepancies[0].type).toBe('over_delivery');
  });
});

describe('Purchase order draft editing, rejection, and cancellation', () => {
  it('edits a draft purchase order, then soft-deletes it', async () => {
    const procurementToken = await loginAs('po6-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po6-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });
    const poId = create.body.data._id;

    const update = await procurement(request(app).put(`/api/v1/purchase-orders/${poId}`)).send({
      lines: [{ item: itemId, quantity: 8, unitPrice: 2 }],
    });
    expect(update.status).toBe(200);
    expect(update.body.data.totalAmount).toBe(16);

    const del = await procurement(request(app).delete(`/api/v1/purchase-orders/${poId}`));
    expect(del.status).toBe(200);

    const getAfter = await procurement(request(app).get(`/api/v1/purchase-orders/${poId}`));
    expect(getAfter.status).toBe(404);
  });

  it('rejects a submitted purchase order', async () => {
    const procurementToken = await loginAs('po7-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po7-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });
    const poId = create.body.data._id;
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });

    const reject = await manager(request(app).post(`/api/v1/purchase-orders/${poId}/reject`)).send({
      version: 1,
      note: 'Budget not approved',
    });
    expect(reject.status).toBe(200);
    expect(reject.body.data.status).toBe('rejected');

    const approveAfterReject = await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({
      version: 2,
    });
    expect(approveAfterReject.status).toBe(400);
  });

  it('marks an approved PO shipped before allowing receipt, and cancels a sent PO', async () => {
    const procurementToken = await loginAs('po8-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po8-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });
    const poId = create.body.data._id;
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });
    await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({ version: 2 });

    const ship = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/ship`)).send({ version: 3 });
    expect(ship.status).toBe(200);
    expect(ship.body.data.status).toBe('shipped');

    const cancel = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/cancel`)).send({
      version: 4,
      note: 'Supplier could not fulfil',
    });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe('cancelled');

    const receiveAfterCancel = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/receive`)).send({
      version: 5,
      lines: [{ item: itemId, receivedQuantity: 5 }],
    });
    expect(receiveAfterCancel.status).toBe(400);
  });

  it('rejects creating a PO against a non-approved supplier or a nonexistent item', async () => {
    const procurementToken = await loginAs('po9-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po9-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);

    const category = await manager(request(app).post('/api/v1/categories')).send({ name: 'Misc' });
    const item = await manager(request(app).post('/api/v1/items')).send({
      name: 'Widget',
      sku: 'WID-9',
      category: category.body.data._id,
      unitCost: 1,
    });
    const pendingSupplier = await procurement(request(app).post('/api/v1/suppliers')).send({ name: 'New Supplier' });

    const badSupplier = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: pendingSupplier.body.data._id,
      lines: [{ item: item.body.data._id, quantity: 1, unitPrice: 1 }],
    });
    expect(badSupplier.status).toBe(400);

    await procurement(request(app).patch(`/api/v1/suppliers/${pendingSupplier.body.data._id}/status`)).send({
      status: 'approved',
    });
    const badItem = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: pendingSupplier.body.data._id,
      lines: [{ item: '64b000000000000000000000', quantity: 1, unitPrice: 1 }],
    });
    expect(badItem.status).toBe(400);
  });

  it('lists purchase orders filtered by status and supplier', async () => {
    const procurementToken = await loginAs('po10-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po10-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });
    const poId = create.body.data._id;
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });

    const byStatus = await procurement(request(app).get('/api/v1/purchase-orders?status=submitted'));
    expect(byStatus.body.data).toHaveLength(1);

    const bySupplier = await procurement(request(app).get(`/api/v1/purchase-orders?supplier=${supplierId}`));
    expect(bySupplier.body.data).toHaveLength(1);

    const byOtherStatus = await procurement(request(app).get('/api/v1/purchase-orders?status=received'));
    expect(byOtherStatus.body.data).toHaveLength(0);
  });

  it('returns 404 for a nonexistent purchase order', async () => {
    const procurementToken = await loginAs('po11-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const procurement = as(procurementToken);
    const res = await procurement(request(app).get('/api/v1/purchase-orders/64b000000000000000000000'));
    expect(res.status).toBe(404);
  });

  it('fetches a single purchase order by id, populated', async () => {
    const procurementToken = await loginAs('po14-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po14-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });

    const getOne = await procurement(request(app).get(`/api/v1/purchase-orders/${create.body.data._id}`));
    expect(getOne.status).toBe(200);
    expect(getOne.body.data.poNumber).toBe(create.body.data.poNumber);
    expect(getOne.body.data.supplier.name).toBe('Bracket Supplier');
  });

  it('filters purchase orders by a created-date range', async () => {
    const procurementToken = await loginAs('po15-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po15-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });

    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const withinRange = await procurement(request(app).get(`/api/v1/purchase-orders?from=${yesterday}&to=${tomorrow}`));
    expect(withinRange.body.data).toHaveLength(1);

    const outsideRange = await procurement(request(app).get(`/api/v1/purchase-orders?from=${tomorrow}`));
    expect(outsideRange.body.data).toHaveLength(0);
  });

  it('rejects editing a non-draft purchase order and a draft edit with a nonexistent item', async () => {
    const procurementToken = await loginAs('po16-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po16-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });
    const poId = create.body.data._id;

    const badItemEdit = await procurement(request(app).put(`/api/v1/purchase-orders/${poId}`)).send({
      lines: [{ item: '64b000000000000000000000', quantity: 1, unitPrice: 1 }],
    });
    expect(badItemEdit.status).toBe(400);

    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });

    const editAfterSubmit = await procurement(request(app).put(`/api/v1/purchase-orders/${poId}`)).send({
      lines: [{ item: itemId, quantity: 1, unitPrice: 1 }],
    });
    expect(editAfterSubmit.status).toBe(400);
  });

  it('rejects transitions attempted from the wrong status or with a stale version', async () => {
    const procurementToken = await loginAs('po17-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po17-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });
    const poId = create.body.data._id;

    // Still draft - sending or rejecting or deleting-as-non-draft don't apply yet.
    const sendTooEarly = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({
      version: 0,
    });
    expect(sendTooEarly.status).toBe(400);

    const rejectTooEarly = await manager(request(app).post(`/api/v1/purchase-orders/${poId}/reject`)).send({
      version: 0,
    });
    expect(rejectTooEarly.status).toBe(400);

    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });

    // Correct status, but the caller's version is stale (a real actor already bumped it).
    const staleApprove = await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({
      version: 0,
    });
    expect(staleApprove.status).toBe(409);

    const staleReject = await manager(request(app).post(`/api/v1/purchase-orders/${poId}/reject`)).send({
      version: 0,
    });
    expect(staleReject.status).toBe(409);

    await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });

    const deleteApproved = await procurement(request(app).delete(`/api/v1/purchase-orders/${poId}`));
    expect(deleteApproved.status).toBe(400);
  });

  it('rejects receiving goods against a draft PO or with a stale version', async () => {
    const procurementToken = await loginAs('po18-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po18-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
    });
    const poId = create.body.data._id;

    const receiveDraft = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/receive`)).send({
      version: 0,
      lines: [{ item: itemId, receivedQuantity: 1 }],
    });
    expect(receiveDraft.status).toBe(400);

    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });
    await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({ version: 2 });

    const staleReceive = await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/receive`)).send({
      version: 0,
      lines: [{ item: itemId, receivedQuantity: 1 }],
    });
    expect(staleReceive.status).toBe(409);
  });
});

describe('Overdue purchase order cron', () => {
  it('raises an overdue_po alert for a receivable PO past its expected delivery date, without duplicating it', async () => {
    const procurementToken = await loginAs('po12-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po12-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
      expectedDeliveryDate: new Date(Date.now() - 86400000).toISOString(),
    });
    const poId = create.body.data._id;
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });
    await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({ version: 2 });

    const firstPass = await flagOverduePurchaseOrders();
    expect(firstPass).toBe(1);

    const alerts = await Alert.find({ purchaseOrder: poId, type: 'overdue_po' });
    expect(alerts).toHaveLength(1);

    const secondPass = await flagOverduePurchaseOrders();
    expect(secondPass).toBe(0);
    const alertsAfter = await Alert.find({ purchaseOrder: poId, type: 'overdue_po' });
    expect(alertsAfter).toHaveLength(1);
  });

  it('does not flag a PO that is not yet past its expected delivery date', async () => {
    const procurementToken = await loginAs('po13-procurement@example.com', ROLES.PROCUREMENT_OFFICER);
    const managerToken = await loginAs('po13-manager@example.com', ROLES.INVENTORY_MANAGER);
    const procurement = as(procurementToken);
    const manager = as(managerToken);
    const { itemId, supplierId } = await setupSupplierAndItem(procurement, manager);

    const create = await procurement(request(app).post('/api/v1/purchase-orders')).send({
      supplier: supplierId,
      lines: [{ item: itemId, quantity: 5, unitPrice: 2 }],
      expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
    });
    const poId = create.body.data._id;
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/submit`)).send({ version: 0 });
    await manager(request(app).post(`/api/v1/purchase-orders/${poId}/approve`)).send({ version: 1 });
    await procurement(request(app).post(`/api/v1/purchase-orders/${poId}/send`)).send({ version: 2 });

    const flagged = await flagOverduePurchaseOrders();
    expect(flagged).toBe(0);

    const found = await PurchaseOrder.findById(poId);
    expect(found.status).toBe('sent');
  });
});
