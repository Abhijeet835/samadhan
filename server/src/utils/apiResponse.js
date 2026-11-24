/**
 * The one and only API envelope.
 *
 * Success: { success: true, data }
 * Failure: { success: false, error: { code, message } }
 */

export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, ApiError);
  }
}

export function sendSuccess(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendError(res, { statusCode = 500, code = 'INTERNAL_SERVER_ERROR', message = 'Something went wrong.' } = {}) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
