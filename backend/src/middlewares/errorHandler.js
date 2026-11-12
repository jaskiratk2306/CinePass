import { AppError } from '../errors/AppError.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Central Error Handler Middleware
 * Guarantees consistent error response shape: { error: { code, message, details? } }
 */
export function errorHandler(err, req, res, next) {
  // 1. Handled AppError instances
  if (err instanceof AppError) {
    const response = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    };
    return res.status(err.statusCode).json(response);
  }

  // 2. Direct Zod validation error
  if (err instanceof ZodError) {
    const formattedDetails = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: formattedDetails,
      },
    });
  }

  // 3. Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: `Unique constraint violated on ${target}`,
          details: err.meta,
        },
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Requested record was not found',
        },
      });
    }
  }

  // 4. JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: err.message === 'jwt expired' ? 'Token has expired' : 'Invalid token',
      },
    });
  }

  // 5. Fallback for unhandled / internal errors
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
