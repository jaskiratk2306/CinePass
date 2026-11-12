import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

/**
 * Sign JWT token for user payload
 * @param {object} payload
 * @returns {string}
 */
export function signToken(payload) {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode JWT token
 * @param {string} token
 * @returns {object}
 */
export function verifyToken(token) {
  return jwt.verify(token, ENV.JWT_SECRET);
}
