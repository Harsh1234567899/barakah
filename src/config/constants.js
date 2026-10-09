module.exports = {


  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,          // max 100 requests per windowMs
  },


  JWT: {
    ACCESS_EXPIRES_IN: '15m',
    REFRESH_EXPIRES_IN: '7d',
    ACCESS_COOKIE_MAX_AGE: 15 * 60 * 1000,
    REFRESH_COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000,
  },

  ROLES: {
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
  },


  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },


  PASSWORD: {
    SALT_ROUNDS: 12,
    RESET_TOKEN_EXPIRES: 10 * 60 * 1000, // 10 minutes
  },

  STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER: 500,
  },

};
