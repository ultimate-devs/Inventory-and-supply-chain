import { AuditLog } from '../models/AuditLog.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes that manage their own, more specific audit entries (e.g. auth login/logout
// records a richer action name) are skipped here to avoid double-logging.
const SKIP_PATH_PREFIXES = ['/api/v1/auth'];

export const auditLogMiddleware = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method) || SKIP_PATH_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    AuditLog.create({
      actor: req.user?.id ?? null,
      action: `${req.method} ${req.baseUrl}${req.route ? req.route.path : req.path}`,
      target: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to write audit log entry:', err.message);
    });
  });

  next();
};

export const recordAuditEvent = async ({ actor, action, target, ip, statusCode = 200 }) => {
  await AuditLog.create({ actor, action, target, ip, statusCode });
};
