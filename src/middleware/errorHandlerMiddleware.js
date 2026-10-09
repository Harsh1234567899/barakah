const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;

  // Base response
  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // Only add errors if they exist and are not empty
  if (err.errors && (Array.isArray(err.errors) ? err.errors.length > 0 : Object.keys(err.errors).length > 0)) {
    response.errors = err.errors;
  }

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    response.message = 'Validation Error';
    response.errors = Object.values(err.errors).map(e => e.message);
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    response.message = 'Duplicate field value';
    const field = Object.keys(err.keyPattern)[0];
    response.errors = [`${field} already exists`];
  }

  // Handle Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    response.message = 'Invalid ID format';
  }

  // Send response
  res.status(statusCode).json(response);
};

module.exports = errorHandler;
