import { PurchaseOrder, PO_STATUS, RECEIVABLE_STATUSES } from '../models/PurchaseOrder.js';
import { Supplier, SUPPLIER_STATUS } from '../models/Supplier.js';
import { Item } from '../models/Item.js';
import { Alert, ALERT_TYPES, ALERT_SEVERITY, ALERT_STATUS } from '../models/Alert.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { getNextSequence } from '../models/Counter.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

const generatePoNumber = async () => {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`po-${year}`);
  return `PO-${year}-${String(seq).padStart(5, '0')}`;
};

export const listPurchaseOrders = async (query) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.supplier) filter.supplier = query.supplier;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const [purchaseOrders, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('supplier', 'name performanceScore status')
      .populate('requestedBy', 'name email')
      .populate('lines.item', 'name sku'),
    PurchaseOrder.countDocuments(filter),
  ]);

  return { purchaseOrders, meta: buildMeta({ page, limit, total }) };
};

export const getPurchaseOrderById = async (id) => {
  const po = await PurchaseOrder.findById(id)
    .populate('supplier', 'name performanceScore status')
    .populate('requestedBy', 'name email')
    .populate('lines.item', 'name sku currentStock')
    .populate('statusHistory.changedBy', 'name email')
    .populate('approvals.approver', 'name email');
  if (!po) throw ApiError.notFound('Purchase order not found');
  return po;
};

export const createPurchaseOrder = async ({ supplier, lines, expectedDeliveryDate, recommendedSupplier }, userId) => {
  const supplierDoc = await Supplier.findById(supplier);
  if (!supplierDoc) throw ApiError.badRequest('Supplier does not exist');
  if (supplierDoc.status !== SUPPLIER_STATUS.APPROVED) {
    throw ApiError.badRequest('Purchase orders can only be raised against an approved supplier');
  }

  const itemIds = lines.map((l) => l.item);
  const items = await Item.find({ _id: { $in: itemIds } });
  if (items.length !== new Set(itemIds).size) {
    throw ApiError.badRequest('One or more items do not exist');
  }

  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const poNumber = await generatePoNumber();

  return PurchaseOrder.create({
    poNumber,
    supplier,
    requestedBy: userId,
    recommendedSupplier: Boolean(recommendedSupplier),
    lines: lines.map((l) => ({ item: l.item, quantity: l.quantity, unitPrice: l.unitPrice })),
    totalAmount,
    expectedDeliveryDate,
    status: PO_STATUS.DRAFT,
    statusHistory: [{ status: PO_STATUS.DRAFT, changedBy: userId, changedAt: new Date() }],
  });
};

export const updateDraftPurchaseOrder = async (id, { lines, expectedDeliveryDate }) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (po.status !== PO_STATUS.DRAFT) {
    throw ApiError.badRequest('Only a draft purchase order can be edited');
  }

  if (lines) {
    const itemIds = lines.map((l) => l.item);
    const items = await Item.find({ _id: { $in: itemIds } });
    if (items.length !== new Set(itemIds).size) {
      throw ApiError.badRequest('One or more items do not exist');
    }
    po.lines = lines.map((l) => ({ item: l.item, quantity: l.quantity, unitPrice: l.unitPrice }));
    po.totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  }
  if (expectedDeliveryDate !== undefined) po.expectedDeliveryDate = expectedDeliveryDate;

  await po.save();
  return po;
};

/**
 * Every status-changing write is a single conditional findOneAndUpdate keyed
 * on `version` (optimistic lock): if another request already moved the PO,
 * the match fails and we tell the caller to refresh rather than silently
 * clobbering their view of the world.
 */
const applyTransition = async ({ id, expectedVersion, fromStatuses, toStatus, userId, note, extraSet = {} }) => {
  const po = await PurchaseOrder.findOneAndUpdate(
    { _id: id, version: expectedVersion, status: { $in: fromStatuses } },
    {
      $set: { status: toStatus, ...extraSet },
      $inc: { version: 1 },
      $push: { statusHistory: { status: toStatus, changedBy: userId, changedAt: new Date(), note } },
    },
    { new: true },
  );

  if (po) return po;

  const current = await PurchaseOrder.findById(id);
  if (!current) throw ApiError.notFound('Purchase order not found');
  if (current.version !== expectedVersion) {
    throw ApiError.conflict('This purchase order was changed by someone else - refresh and try again');
  }
  throw ApiError.badRequest(`Cannot move a ${current.status} purchase order to ${toStatus}`);
};

export const submitPurchaseOrder = async (id, userId, expectedVersion) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw ApiError.notFound('Purchase order not found');
  const settings = await SystemSettings.getSingleton();
  const requiresSecondApproval = po.totalAmount > settings.poTwoLevelApprovalThreshold;

  return applyTransition({
    id,
    expectedVersion,
    fromStatuses: [PO_STATUS.DRAFT],
    toStatus: PO_STATUS.SUBMITTED,
    userId,
    extraSet: { requiresSecondApproval },
  });
};

export const approvePurchaseOrder = async (id, userId, note, expectedVersion) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (po.status !== PO_STATUS.SUBMITTED) {
    throw ApiError.badRequest(`Cannot approve a purchase order in status ${po.status}`);
  }

  const approvalsSoFar = po.approvals.filter((a) => a.decision === 'approved');
  const nextLevel = approvalsSoFar.length + 1;

  if (nextLevel === 2 && approvalsSoFar[0]?.approver.toString() === userId) {
    throw ApiError.badRequest('The second approval must come from a different approver');
  }

  const isFinalApproval = !po.requiresSecondApproval || nextLevel === 2;
  const approvalEntry = { level: nextLevel, approver: userId, decision: 'approved', note, decidedAt: new Date() };

  const update = {
    $inc: { version: 1 },
    $push: {
      approvals: approvalEntry,
      ...(isFinalApproval
        ? { statusHistory: { status: PO_STATUS.APPROVED, changedBy: userId, changedAt: new Date(), note } }
        : {}),
    },
  };
  if (isFinalApproval) update.$set = { status: PO_STATUS.APPROVED };

  const updated = await PurchaseOrder.findOneAndUpdate(
    { _id: id, version: expectedVersion, status: PO_STATUS.SUBMITTED },
    update,
    { new: true },
  );
  if (!updated) {
    throw ApiError.conflict('This purchase order was changed by someone else - refresh and try again');
  }
  return updated;
};

export const rejectPurchaseOrder = async (id, userId, note, expectedVersion) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (po.status !== PO_STATUS.SUBMITTED) {
    throw ApiError.badRequest(`Cannot reject a purchase order in status ${po.status}`);
  }

  const updated = await PurchaseOrder.findOneAndUpdate(
    { _id: id, version: expectedVersion, status: PO_STATUS.SUBMITTED },
    {
      $set: { status: PO_STATUS.REJECTED },
      $inc: { version: 1 },
      $push: {
        approvals: { level: po.approvals.length + 1, approver: userId, decision: 'rejected', note, decidedAt: new Date() },
        statusHistory: { status: PO_STATUS.REJECTED, changedBy: userId, changedAt: new Date(), note },
      },
    },
    { new: true },
  );
  if (!updated) {
    throw ApiError.conflict('This purchase order was changed by someone else - refresh and try again');
  }
  return updated;
};

export const sendPurchaseOrder = (id, userId, expectedVersion) =>
  applyTransition({ id, expectedVersion, fromStatuses: [PO_STATUS.APPROVED], toStatus: PO_STATUS.SENT, userId });

export const shipPurchaseOrder = (id, userId, expectedVersion) =>
  applyTransition({ id, expectedVersion, fromStatuses: [PO_STATUS.SENT], toStatus: PO_STATUS.SHIPPED, userId });

export const cancelPurchaseOrder = (id, userId, note, expectedVersion) =>
  applyTransition({
    id,
    expectedVersion,
    fromStatuses: [PO_STATUS.DRAFT, PO_STATUS.SUBMITTED, PO_STATUS.APPROVED, PO_STATUS.SENT, PO_STATUS.SHIPPED],
    toStatus: PO_STATUS.CANCELLED,
    userId,
    note,
  });

export const deleteDraftPurchaseOrder = async (id) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (po.status !== PO_STATUS.DRAFT) {
    throw ApiError.badRequest('Only a draft purchase order can be deleted');
  }
  po.isDeleted = true;
  po.deletedAt = new Date();
  await po.save();
};

/**
 * Raises an overdue_po alert for any receivable PO whose expected delivery
 * date has passed and that doesn't already have an open one. Intended to run
 * from the hourly cron; returns the count of newly-raised alerts.
 */
export const flagOverduePurchaseOrders = async () => {
  const overdue = await PurchaseOrder.find({
    status: { $in: RECEIVABLE_STATUSES },
    expectedDeliveryDate: { $lt: new Date() },
  });

  let flagged = 0;
  for (const po of overdue) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Alert.findOne({
      purchaseOrder: po._id,
      type: ALERT_TYPES.OVERDUE_PO,
      status: { $in: [ALERT_STATUS.OPEN, ALERT_STATUS.ACKNOWLEDGED] },
    });
    if (existing) continue;

    // eslint-disable-next-line no-await-in-loop
    await Alert.create({
      type: ALERT_TYPES.OVERDUE_PO,
      severity: ALERT_SEVERITY.WARNING,
      message: `Purchase order ${po.poNumber} is overdue (expected ${po.expectedDeliveryDate.toDateString()})`,
      purchaseOrder: po._id,
      supplier: po.supplier,
    });
    flagged += 1;
  }
  return flagged;
};
