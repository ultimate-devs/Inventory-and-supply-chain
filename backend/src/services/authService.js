import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { generateRandomToken, hashToken } from '../utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { durationFromNow } from '../utils/duration.js';
import { sendPasswordResetEmail } from './emailService.js';

const MAX_ACTIVE_REFRESH_TOKENS = 5;

const issueTokenPair = async (user, ip) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const activeTokens = user.refreshTokens.filter((t) => t.expiresAt > new Date());
  activeTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: durationFromNow(env.jwt.refreshExpiresIn),
    createdByIp: ip,
  });
  user.refreshTokens = activeTokens.slice(-MAX_ACTIVE_REFRESH_TOKENS);
  await user.save();

  return { accessToken, refreshToken };
};

export const loginUser = async ({ email, password, ip }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash +refreshTokens +tempPasswordExpires',
  );
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
  }
  if (user.mustChangePassword && user.tempPasswordExpires && user.tempPasswordExpires < new Date()) {
    throw ApiError.unauthorized('Your temporary password has expired. Ask an administrator to reset it.');
  }

  const tokens = await issueTokenPair(user, ip);
  user.lastLoginAt = new Date();
  await user.save();

  return { user, ...tokens };
};

export const refreshSession = async ({ refreshToken, ip }) => {
  if (!refreshToken) {
    throw ApiError.unauthorized('Missing refresh token');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid session');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = user.refreshTokens.find((t) => t.tokenHash === tokenHash);
  if (!stored || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  // Rotate: remove the used token before issuing a new pair.
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
  const tokens = await issueTokenPair(user, ip);

  return { user, ...tokens };
};

export const logoutUser = async ({ userId, refreshToken }) => {
  if (!userId || !refreshToken) return;
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;
  const tokenHash = hashToken(refreshToken);
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
  await user.save();
};

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Do not reveal whether the account exists.
    return null;
  }
  const resetToken = generateRandomToken(32);
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpires = durationFromNow('1h');
  await user.save();

  const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;
  await sendPasswordResetEmail({ to: user.email, resetUrl });

  return resetToken;
};

export const resetPassword = async ({ token, newPassword }) => {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires +refreshTokens');

  if (!user) {
    throw ApiError.badRequest('Password reset token is invalid or has expired');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.mustChangePassword = false;
  user.tempPasswordExpires = undefined;
  user.refreshTokens = []; // Invalidate all existing sessions on password change.
  await user.save();
};

export const changePassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.mustChangePassword = false;
  user.tempPasswordExpires = undefined;
  await user.save();

  return user;
};

export const REFRESH_COOKIE_NAME = 'refreshToken';

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
