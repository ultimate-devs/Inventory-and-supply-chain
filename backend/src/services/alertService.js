import { Alert, ALERT_TYPES, ALERT_SEVERITY, ALERT_STATUS } from '../models/Alert.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

const STOCK_ALERT_TYPES = [ALERT_TYPES.LOW_STOCK, ALERT_TYPES.CRITICAL_STOCK, ALERT_TYPES.EXCESS_STOCK];

const STATUS_TO_ALERT_TYPE = {
  critical: ALERT_TYPES.CRITICAL_STOCK,
  low: ALERT_TYPES.LOW_STOCK,
  excess: ALERT_TYPES.EXCESS_STOCK,
};

const SEVERITY_BY_TYPE = {
  [ALERT_TYPES.CRITICAL_STOCK]: ALERT_SEVERITY.CRITICAL,
  [ALERT_TYPES.LOW_STOCK]: ALERT_SEVERITY.WARNING,
  [ALERT_TYPES.EXCESS_STOCK]: ALERT_SEVERITY.INFO,
};

const buildStockMessage = (item, type) => {
  switch (type) {
    case ALERT_TYPES.CRITICAL_STOCK:
      return `${item.name} (${item.sku}) is at or below safety stock - ${item.currentStock} units remaining`;
    case ALERT_TYPES.LOW_STOCK:
      return `${item.name} (${item.sku}) has reached its reorder point - ${item.currentStock} units remaining`;
    case ALERT_TYPES.EXCESS_STOCK:
      return `${item.name} (${item.sku}) is significantly overstocked - ${item.currentStock} units on hand`;
    default:
      return `${item.name} (${item.sku}) stock status changed`;
  }
};

/**
 * Keeps open low/critical/excess-stock alerts for one item in sync with its
 * current stockStatus: opens (or upgrades/downgrades) the matching alert, and
 * resolves it once the item is back to 'ok'. Runs inside the same
 * transaction session as the stock update that triggered it, when one exists,
 * so a stock change and its alert are never left out of sync.
 */
export const syncStockAlerts = async (item, { session } = {}) => {
  const targetType = STATUS_TO_ALERT_TYPE[item.stockStatus];

  const existing = await Alert.findOne({
    item: item._id,
    type: { $in: STOCK_ALERT_TYPES },
    status: { $in: [ALERT_STATUS.OPEN, ALERT_STATUS.ACKNOWLEDGED] },
  }).session(session ?? null);

  if (!targetType) {
    if (existing) {
      existing.status = ALERT_STATUS.RESOLVED;
      existing.resolvedAt = new Date();
      await existing.save({ session });
    }
    return;
  }

  const message = buildStockMessage(item, targetType);

  if (!existing) {
    await Alert.create([{ type: targetType, severity: SEVERITY_BY_TYPE[targetType], message, item: item._id }], {
      session,
    });
    return;
  }

  if (existing.type !== targetType || existing.message !== message) {
    existing.type = targetType;
    existing.severity = SEVERITY_BY_TYPE[targetType];
    existing.message = message;
    // Any earlier acknowledgement no longer applies once severity/type changes.
    existing.status = ALERT_STATUS.OPEN;
    existing.acknowledgedBy = undefined;
    existing.acknowledgedAt = undefined;
    await existing.save({ session });
  }
};

export const listAlerts = async (query) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;

  const [alerts, total] = await Promise.all([
    Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('item', 'name sku')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'name'),
    Alert.countDocuments(filter),
  ]);

  return { alerts, meta: buildMeta({ page, limit, total }) };
};

export const getUnreadCount = () => Alert.countDocuments({ status: ALERT_STATUS.OPEN });

export const getAlertById = async (id) => {
  const alert = await Alert.findById(id).populate('item', 'name sku').populate('purchaseOrder', 'poNumber');
  if (!alert) throw ApiError.notFound('Alert not found');
  return alert;
};

export const acknowledgeAlert = async (id, userId) => {
  const alert = await getAlertById(id);
  if (alert.status === ALERT_STATUS.OPEN) {
    alert.status = ALERT_STATUS.ACKNOWLEDGED;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    await alert.save();
  }
  return alert;
};

export const resolveAlert = async (id, userId) => {
  const alert = await getAlertById(id);
  alert.status = ALERT_STATUS.RESOLVED;
  alert.resolvedBy = userId;
  alert.resolvedAt = new Date();
  await alert.save();
  return alert;
};
