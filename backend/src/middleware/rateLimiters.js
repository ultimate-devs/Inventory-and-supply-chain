import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env.js';

const skip = () => isTest;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, message: 'Too many auth attempts, please try again later' },
  skip,
});

export const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, message: 'Too many requests, please slow down' },
  skip,
});
