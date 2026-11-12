import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Extracts JWT token from Authorization header or cookies.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && (req.cookies.token || req.cookies.jwt)) {
    return req.cookies.token || req.cookies.jwt;
  }
  return null;
}

/**
 * Middleware ensuring request is authenticated via Bearer token or httpOnly cookie.
 * Populates `req.user` with decoded token payload: { id, email, role, name }.
 */
export function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next(new UnauthorizedError('Authentication token missing', 'UNAUTHORIZED'));
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return next(new UnauthorizedError(
      err.name === 'TokenExpiredError' ? 'Authentication token has expired' : 'Invalid authentication token',
      'UNAUTHORIZED'
    ));
  }
}

/**
 * Middleware ensuring authenticated user possesses one of the allowed roles.
 * @param  {...string} roles - e.g. 'ADMIN', 'USER'
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Access forbidden: insufficient role permissions', 'FORBIDDEN'));
    }

    return next();
  };
}

/**
 * Optional authentication middleware that populates `req.user` if token exists,
 * but allows unauthenticated requests to proceed.
 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch (e) {
    // Ignore invalid optional tokens
  }
  return next();
}
