import * as categoryService from '../services/categoryService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const list = asyncHandler(async (req, res) => {
  const { categories, meta } = await categoryService.listCategories(req.query);
  sendResponse(res, 200, { data: categories, message: 'Categories retrieved', meta });
});

export const getOne = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  sendResponse(res, 200, { data: category, message: 'Category retrieved' });
});

export const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  await recordAuditEvent({ actor: req.user.id, action: 'category.create', target: category._id.toString(), ip: req.ip });
  sendResponse(res, 201, { data: category, message: 'Category created' });
});

export const update = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  await recordAuditEvent({ actor: req.user.id, action: 'category.update', target: category._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: category, message: 'Category updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  await recordAuditEvent({ actor: req.user.id, action: 'category.delete', target: req.params.id, ip: req.ip });
  sendResponse(res, 200, { message: 'Category deleted' });
});
