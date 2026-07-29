import { User } from '../models/User.js';
import { ROLES } from '../config/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { generateRandomToken, hashToken } from '../utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { durationFromNow } from '../utils/duration.js';

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

// Public self-registration always gets the least-privileged role. Role
// elevation is an admin-only action via PUT /users/:id (see userController) -
// letting callers pick their own role here would be a privilege-escalation hole.
export const registerUser = async ({ name, email, password }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: ROLES.ANALYST,
  });
  return user;
};

export const loginUser = async ({ email, password, ip }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
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
  user.refreshTokens = []; // Invalidate all existing sessions on password change.
  await user.save();
};

export const REFRESH_COOKIE_NAME = 'refreshToken';

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
