import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/sendResponse.js';

// Routes a user with a pending forced password change may still reach -
// everything else is blocked until they change it.
const PASSWORD_CHANGE_ALLOWLIST = ['/api/v1/auth/change-password', '/api/v1/auth/logout', '/api/v1/auth/me'];

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  const token = header.slice('Bearer '.length);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account not found or deactivated');
  }

  if (user.mustChangePassword && !PASSWORD_CHANGE_ALLOWLIST.includes(req.originalUrl.split('?')[0])) {
    throw ApiError.forbidden('You must change your password before continuing');
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    isServiceAccount: user.isServiceAccount,
    mustChangePassword: user.mustChangePassword,
  };
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};
