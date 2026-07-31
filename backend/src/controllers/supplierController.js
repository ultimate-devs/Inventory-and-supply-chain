import * as supplierService from '../services/supplierService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const list = asyncHandler(async (req, res) => {
  const { suppliers, meta } = await supplierService.listSuppliers(req.query);
  sendResponse(res, 200, { data: suppliers, message: 'Suppliers retrieved', meta });
});

export const ranked = asyncHandler(async (req, res) => {
  const suppliers = await supplierService.listRankedSuppliers();
  sendResponse(res, 200, { data: suppliers, message: 'Ranked suppliers retrieved' });
});

export const recommend = asyncHandler(async (req, res) => {
  const result = await supplierService.recommendSuppliersForItem(req.query.item);
  sendResponse(res, 200, { data: result, message: 'Supplier recommendation computed' });
});

export const getOne = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getSupplierById(req.params.id);
  sendResponse(res, 200, { data: supplier, message: 'Supplier retrieved' });
});

export const create = asyncHandler(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.body);
  await recordAuditEvent({ actor: req.user.id, action: 'supplier.create', target: supplier._id.toString(), ip: req.ip });
  sendResponse(res, 201, { data: supplier, message: 'Supplier created' });
});

export const update = asyncHandler(async (req, res) => {
  const supplier = await supplierService.updateSupplier(req.params.id, req.body);
  await recordAuditEvent({ actor: req.user.id, action: 'supplier.update', target: supplier._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: supplier, message: 'Supplier updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await supplierService.deleteSupplier(req.params.id);
  await recordAuditEvent({ actor: req.user.id, action: 'supplier.delete', target: req.params.id, ip: req.ip });
  sendResponse(res, 200, { message: 'Supplier deleted' });
});

export const setStatus = asyncHandler(async (req, res) => {
  const supplier = await supplierService.setSupplierStatus(req.params.id, req.body.status, req.user.id);
  await recordAuditEvent({
    actor: req.user.id,
    action: `supplier.status.${req.body.status}`,
    target: supplier._id.toString(),
    ip: req.ip,
  });
  sendResponse(res, 200, { data: supplier, message: 'Supplier status updated' });
});

export const upsertCatalogueEntry = asyncHandler(async (req, res) => {
  const supplier = await supplierService.upsertCatalogueEntry(req.params.id, req.body);
  await recordAuditEvent({
    actor: req.user.id,
    action: 'supplier.catalogue.upsert',
    target: supplier._id.toString(),
    ip: req.ip,
  });
  sendResponse(res, 200, { data: supplier, message: 'Catalogue entry saved' });
});

export const removeCatalogueEntry = asyncHandler(async (req, res) => {
  const supplier = await supplierService.removeCatalogueEntry(req.params.id, req.params.itemId);
  await recordAuditEvent({
    actor: req.user.id,
    action: 'supplier.catalogue.remove',
    target: supplier._id.toString(),
    ip: req.ip,
  });
  sendResponse(res, 200, { data: supplier, message: 'Catalogue entry removed' });
});
