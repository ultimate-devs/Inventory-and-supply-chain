import { User } from '../models/User.js';
import { ROLES } from '../config/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { recordAuditEvent } from '../middleware/auditLog.js';
import { generateTempPassword } from '../utils/crypto.js';
import { durationFromNow } from '../utils/duration.js';
import { sendUserInviteEmail } from '../services/emailService.js';
import { env } from '../config/env.js';

const TEMP_PASSWORD_TTL = '24h';

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await User.hashPassword(tempPassword);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: role || ROLES.ANALYST,
    mustChangePassword: true,
    tempPasswordExpires: durationFromNow(TEMP_PASSWORD_TTL),
  });

  await sendUserInviteEmail({
    to: user.email,
    name: user.name,
    tempPassword,
    loginUrl: `${env.frontendUrl}/login`,
  });

  await recordAuditEvent({
    actor: req.user.id,
    action: 'user.create',
    target: user._id.toString(),
    ip: req.ip,
  });

  sendResponse(res, 201, {
    // tempPassword is only ever exposed here in tests (no SMTP to intercept it
    // with) - mirrors the resetToken pattern in authController.forgotPassword.
    data: { ...user.toSafeJSON(), ...(process.env.NODE_ENV === 'test' ? { tempPassword } : {}) },
    message: 'User created and invite email sent',
  });
});

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

export const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const tempPassword = generateTempPassword();
  user.passwordHash = await User.hashPassword(tempPassword);
  user.mustChangePassword = true;
  user.tempPasswordExpires = durationFromNow(TEMP_PASSWORD_TTL);
  user.refreshTokens = [];
  await user.save();

  await sendUserInviteEmail({
    to: user.email,
    name: user.name,
    tempPassword,
    loginUrl: `${env.frontendUrl}/login`,
  });

  await recordAuditEvent({
    actor: req.user.id,
    action: 'user.reset_password',
    target: user._id.toString(),
    ip: req.ip,
  });

  sendResponse(res, 200, {
    data: process.env.NODE_ENV === 'test' ? { tempPassword } : null,
    message: 'Temporary password generated and emailed to the user',
  });
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
