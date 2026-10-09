/**
 * Smart API Error Class
 * Simple, flexible error handling with auto-detection
 *
 * Usage:
 * throw new ApiError(404, 'User not found');
 * throw new ApiError(400, ['error1', 'error2']);
 * throw new ApiError(400, 'Validation failed', ['error1', 'error2']);
 * throw new ApiError(400, { field: 'error' });
 */
class ApiError extends Error {
  constructor(statusCode, messageOrErrors, additionalErrors) {
    // Set error message
    const message = typeof messageOrErrors === 'string'
      ? messageOrErrors
      : 'An error occurred';

    super(message);

    // Always include
    this.statusCode = statusCode;
    this.success = false;
    this.message = message;

    // Smart error detection (only add if present)
    if (additionalErrors && Array.isArray(additionalErrors) && additionalErrors.length > 0) {
      // Case: new ApiError(400, 'Validation failed', ['error1', 'error2'])
      this.errors = additionalErrors;
    } else if (Array.isArray(messageOrErrors) && messageOrErrors.length > 0) {
      // Case: new ApiError(400, ['error1', 'error2'])
      this.errors = messageOrErrors;
      this.message = 'Validation failed';
    } else if (typeof messageOrErrors === 'object' && messageOrErrors !== null && Object.keys(messageOrErrors).length > 0) {
      // Case: new ApiError(400, { field: 'error' })
      this.errors = messageOrErrors;
    }
    // Don't add errors property if empty

    // Capture stack trace (only in development)
    // if (process.env.NODE_ENV === 'development') {
    //   Error.captureStackTrace(this, this.constructor);
    // }
  }
}

module.exports = ApiError;
