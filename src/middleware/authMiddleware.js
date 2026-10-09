const jwt = require('jsonwebtoken');
const { asyncHandler } = require('devil-backend-nodejs');
const ApiError = require('../utils/ApiError');

exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // Fallback: Check Authorization header (for testing/mobile apps)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded._id || !decoded.role) {
      throw new ApiError(401, 'Access token is missing required claims');
    }

    req.user = {
      _id: decoded._id,
      id: decoded._id,
      userName: decoded.userName,
      employeeCode: decoded.employeeCode,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired, please login again');
    }
    throw error;
  }
});

exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentication required'));

  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, `User role '${req.user.role}' is not authorized`));
  }

  next();
};
