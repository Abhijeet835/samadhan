import { ZodError } from 'zod';

import { isProduction } from '../config/env.js';
import { ApiError, sendError } from '../utils/apiResponse.js';

const formatZodIssues = (error) =>
  error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'body';
      return `${field}: ${issue.message}`;
    })
    .join('; ');

export function notFound(req, _res, next) {
  next(new ApiError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

/**
 * Centralized error handler. Converts Zod, Mongoose, JSON parsing and CORS
 * failures into the standard API envelope, and never leaks stack traces.
 */
export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details = null;

  if (error instanceof ZodError || error?.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = `Validation failed — ${formatZodIssues(error)}`;
  } else if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error?.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Request body contains invalid JSON.';
  } else if (error?.name === 'ValidationError') {
    statusCode = 400;
    code = 'MONGO_VALIDATION_ERROR';
    message = Object.values(error.errors ?? {})
      .map((item) => item.message)
      .join('; ') || 'Database validation failed.';
  } else if (error?.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid value for "${error.path}".`;
  } else if (error?.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'A record with these details already exists.';
  }

  if (statusCode >= 500 || !isProduction) {
    console.error(`[error] ${req.method} ${req.originalUrl} → ${statusCode} ${code}`);
    console.error(error);
  }

  return sendError(res, { statusCode, code, message, details });
}
