import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);

export const signRefreshToken = (user) =>
  // jti ensures uniqueness even when two tokens are issued within the same second
  // (JWT `iat` has 1s resolution), which matters for refresh-token rotation.
  jwt.sign({ sub: user._id.toString(), jti: crypto.randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });

export const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);
