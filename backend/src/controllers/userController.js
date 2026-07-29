import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: users.map((u) => u.toSafeJSON()),
    message: 'Users retrieved',
    meta: buildMeta({ page, limit, total }),
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  sendResponse(res, 200, { data: user.toSafeJSON(), message: 'User retrieved' });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, role, isActive } = req.body;
  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();

  await recordAuditEvent({
    actor: req.user.id,
    action: 'user.update',
    target: user._id.toString(),
    ip: req.ip,
  });

  sendResponse(res, 200, { data: user.toSafeJSON(), message: 'User updated' });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  user.isDeleted = true;
  user.deletedAt = new Date();
  user.isActive = false;
  user.refreshTokens = [];
  await user.save();

  await recordAuditEvent({
    actor: req.user.id,
    action: 'user.deactivate',
    target: user._id.toString(),
    ip: req.ip,
  });

  sendResponse(res, 200, { message: 'User deactivated' });
});
