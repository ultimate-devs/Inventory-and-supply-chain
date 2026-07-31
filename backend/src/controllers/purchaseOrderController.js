import * as poService from '../services/purchaseOrderService.js';
import { receiveGoods } from '../services/grnService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const list = asyncHandler(async (req, res) => {
  const { purchaseOrders, meta } = await poService.listPurchaseOrders(req.query);
  sendResponse(res, 200, { data: purchaseOrders, message: 'Purchase orders retrieved', meta });
});

export const getOne = asyncHandler(async (req, res) => {
  const po = await poService.getPurchaseOrderById(req.params.id);
  sendResponse(res, 200, { data: po, message: 'Purchase order retrieved' });
});

export const create = asyncHandler(async (req, res) => {
  const po = await poService.createPurchaseOrder(req.body, req.user.id);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.create', target: po._id.toString(), ip: req.ip });
  sendResponse(res, 201, { data: po, message: 'Purchase order created' });
});

export const updateDraft = asyncHandler(async (req, res) => {
  const po = await poService.updateDraftPurchaseOrder(req.params.id, req.body);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.update', target: po._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: po, message: 'Purchase order updated' });
});

export const submit = asyncHandler(async (req, res) => {
  const po = await poService.submitPurchaseOrder(req.params.id, req.user.id, req.body.version);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.submit', target: po._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: po, message: 'Purchase order submitted for approval' });
});

export const approve = asyncHandler(async (req, res) => {
  const po = await poService.approvePurchaseOrder(req.params.id, req.user.id, req.body.note, req.body.version);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.approve', target: po._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: po, message: 'Purchase order approval recorded' });
});

export const reject = asyncHandler(async (req, res) => {
  const po = await poService.rejectPurchaseOrder(req.params.id, req.user.id, req.body.note, req.body.version);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.reject', target: po._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: po, message: 'Purchase order rejected' });
});

export const send = asyncHandler(async (req, res) => {
  const po = await poService.sendPurchaseOrder(req.params.id, req.user.id, req.body.version);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.send', target: po._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: po, message: 'Purchase order sent to supplier' });
});

export const ship = asyncHandler(async (req, res) => {
  const po = await poService.shipPurchaseOrder(req.params.id, req.user.id, req.body.version);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.ship', target: po._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: po, message: 'Purchase order marked as shipped' });
});

export const cancel = asyncHandler(async (req, res) => {
  const po = await poService.cancelPurchaseOrder(req.params.id, req.user.id, req.body.note, req.body.version);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.cancel', target: po._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: po, message: 'Purchase order cancelled' });
});

export const remove = asyncHandler(async (req, res) => {
  await poService.deleteDraftPurchaseOrder(req.params.id);
  await recordAuditEvent({ actor: req.user.id, action: 'purchaseOrder.delete', target: req.params.id, ip: req.ip });
  sendResponse(res, 200, { message: 'Purchase order deleted' });
});

export const receive = asyncHandler(async (req, res) => {
  const result = await receiveGoods(req.params.id, req.body.lines, req.body.version, req.user.id);
  await recordAuditEvent({
    actor: req.user.id,
    action: 'purchaseOrder.receive',
    target: result.purchaseOrder._id.toString(),
    ip: req.ip,
  });
  sendResponse(res, 200, { data: result, message: 'Goods received' });
});
