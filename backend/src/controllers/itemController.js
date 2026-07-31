import * as itemService from '../services/itemService.js';
import { recordStockMovement, recordConsumption, listMovementsForItem } from '../services/stockMovementService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await itemService.listItems(req.query);
  sendResponse(res, 200, { data: items, message: 'Items retrieved', meta });
});

export const getOne = asyncHandler(async (req, res) => {
  const item = await itemService.getItemById(req.params.id);
  sendResponse(res, 200, { data: item, message: 'Item retrieved' });
});

export const create = asyncHandler(async (req, res) => {
  const item = await itemService.createItem(req.body);
  await recordAuditEvent({ actor: req.user.id, action: 'item.create', target: item._id.toString(), ip: req.ip });
  sendResponse(res, 201, { data: item, message: 'Item created' });
});

export const update = asyncHandler(async (req, res) => {
  const item = await itemService.updateItem(req.params.id, req.body);
  await recordAuditEvent({ actor: req.user.id, action: 'item.update', target: item._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: item, message: 'Item updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await itemService.deleteItem(req.params.id);
  await recordAuditEvent({ actor: req.user.id, action: 'item.delete', target: req.params.id, ip: req.ip });
  sendResponse(res, 200, { message: 'Item deleted' });
});

export const addMovement = asyncHandler(async (req, res) => {
  const { item, movement } = await recordStockMovement({
    itemId: req.params.id,
    ...req.body,
    performedBy: req.user.id,
  });
  await recordAuditEvent({
    actor: req.user.id,
    action: `item.stockMovement.${movement.type}`,
    target: item._id.toString(),
    ip: req.ip,
  });
  sendResponse(res, 201, { data: { item, movement }, message: 'Stock movement recorded' });
});

export const listMovements = asyncHandler(async (req, res) => {
  const movements = await listMovementsForItem(req.params.id);
  sendResponse(res, 200, { data: movements, message: 'Stock movements retrieved' });
});

export const addConsumption = asyncHandler(async (req, res) => {
  const { item, movement } = await recordConsumption({
    itemId: req.params.id,
    quantity: req.body.quantity,
    reason: req.body.reason,
    performedBy: req.user.id,
  });
  await recordAuditEvent({
    actor: req.user.id,
    action: 'item.stockMovement.consumption',
    target: item._id.toString(),
    ip: req.ip,
  });
  sendResponse(res, 201, { data: { item, movement }, message: 'Consumption recorded' });
});
