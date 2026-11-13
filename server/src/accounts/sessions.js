import { createHash, randomBytes } from 'node:crypto';
import { SESSION_DAYS } from '../http/cookies.js';

export const newSessionToken = () => randomBytes(32).toString('base64url');

export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

export const sessionEnds = (now = Date.now()) => new Date(now + SESSION_DAYS * 86400 * 1000);
