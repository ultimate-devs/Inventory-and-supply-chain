import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import {
  loginUser,
  refreshSession,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  changePassword,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '../services/authService.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
};

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await loginUser({ ...req.body, ip: req.ip });
  setRefreshCookie(res, refreshToken);
  await recordAuditEvent({ actor: user._id, action: 'auth.login', target: user.email, ip: req.ip });
  sendResponse(res, 200, { data: { user: user.toSafeJSON(), accessToken }, message: 'Signed in' });
});

export const refresh = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await refreshSession({
    refreshToken: req.cookies?.[REFRESH_COOKIE_NAME],
    ip: req.ip,
  });
  setRefreshCookie(res, refreshToken);
  sendResponse(res, 200, { data: { user: user.toSafeJSON(), accessToken }, message: 'Session refreshed' });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await logoutUser({ userId: req.user?.id, refreshToken });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
  if (req.user) {
    await recordAuditEvent({ actor: req.user.id, action: 'auth.logout', target: req.user.email, ip: req.ip });
  }
  sendResponse(res, 200, { message: 'Signed out' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const resetToken = await requestPasswordReset(req.body.email);
  // In production this token would be emailed, never returned in the API response.
  sendResponse(res, 200, {
    message: 'If an account with that email exists, a reset link has been sent',
    data: process.env.NODE_ENV === 'test' ? { resetToken } : null,
  });
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  await resetPassword(req.body);
  sendResponse(res, 200, { message: 'Password has been reset, please sign in again' });
});

export const changePasswordHandler = asyncHandler(async (req, res) => {
  const user = await changePassword({
    userId: req.user.id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  await recordAuditEvent({ actor: req.user.id, action: 'auth.change_password', target: user.email, ip: req.ip });
  sendResponse(res, 200, { data: user.toSafeJSON(), message: 'Password updated' });
});

export const me = asyncHandler(async (req, res) => {
  sendResponse(res, 200, { data: req.user, message: 'Current user' });
});
