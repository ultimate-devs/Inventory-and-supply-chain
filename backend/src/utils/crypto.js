import crypto from 'node:crypto';

export const generateRandomToken = (bytes = 40) => crypto.randomBytes(bytes).toString('hex');

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Prefix guarantees the password validator's "at least one digit" rule
// regardless of what the random suffix happens to contain.
export const generateTempPassword = () => `Tmp1-${crypto.randomBytes(9).toString('base64url')}`;
