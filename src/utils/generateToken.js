const jwt = require('jsonwebtoken');
const constants = require('../config/constants');


const generateAccessToken = (user) => {

  return jwt.sign(
    {
      _id: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role?.name 
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: constants.JWT.ACCESS_EXPIRES_IN } // 1d
  );
};


const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: constants.JWT.REFRESH_EXPIRES_IN } // 7d
  );
};


const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access Token Cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: constants.JWT.ACCESS_COOKIE_MAX_AGE,
  });

  // Refresh Token Cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: constants.JWT.REFRESH_COOKIE_MAX_AGE,
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
};
