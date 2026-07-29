import crypto from 'node:crypto';

export const generateRandomToken = (bytes = 40) => crypto.randomBytes(bytes).toString('hex');

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
