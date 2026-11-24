/**
 * The one and only API envelope.
 *
 * Success: { success: true, data }
 * Failure: { success: false, error: { code, message } }
 */

export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    // Optional extra envelope fields (e.g. { existingIssue } on DUPLICATE_FOUND).
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }
}

export function sendSuccess(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendError(res, { statusCode = 500, code = 'INTERNAL_SERVER_ERROR', message = 'Something went wrong.', details = null } = {}) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ?? {}),
    },
  });
}

/**
 * Create success response object
 */
export function apiSuccess(data = null) {
  return {
    success: true,
    data,
  };
}

/**
 * Create error response object
 */
export function apiError(code = 'INTERNAL_SERVER_ERROR', message = 'Something went wrong.') {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
