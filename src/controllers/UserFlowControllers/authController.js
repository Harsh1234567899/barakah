const crypto = require('crypto');
const User = require('../../models/UserFlowModels/userModel');
const Customer = require('../../models/UserFlowModels/customerModel')
const { asyncHandler } = require('devil-backend-nodejs');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const { generateAccessToken, generateRefreshToken, setTokenCookies } = require('../../utils/generateToken');
const {  checkOwnerOrAdmin, generateCustomerCode } = require('../../utils/otherUtils');
const constants = require('../../config/constants');
const mongoose = require('mongoose');


exports.register = asyncHandler(async (req, res) => {
  const { userName, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match');
  }

  const session = await mongoose.startSession();
  let registeredUser;

  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{
        userName,
        email,
        password,
        joiningDate: String(new Date().toLocaleDateString('en-GB')),
      }], { session });

      await Customer.create([{
        user: user._id,
        customerCode: generateCustomerCode(),
      }], { session });

      registeredUser = user;
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        throw new ApiError(409, 'Email already registered');
      }
      if (error.keyPattern?.customerCode) {
        throw new ApiError(409, 'Could not create a unique customer code; please retry');
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }

  res.status(constants.STATUS.CREATED).json(
    new ApiResponse(constants.STATUS.CREATED, {
      message: 'Registration successful',
      user: {
        _id: registeredUser._id,
        joiningDate: registeredUser.joiningDate,
        userName: registeredUser.userName,
        email: registeredUser.email,
        isVerified: registeredUser.isVerified,
        role: constants.ROLES.CUSTOMER,
      },
    })
  );
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshToken').populate('role', 'name');
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password');

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  setTokenCookies(res, accessToken, refreshToken);

  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, {
      message: 'Login successful',
      user: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role?.name || user.role?._id,
        isVerified: user.isVerified,
      },
      accessToken,
    })
  );
});

exports.logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, { message: 'Logged out successfully' })
  );
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("role", "name");
  if (!user) throw new ApiError(404, 'User not found');

  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, { user })
  );
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token provided');

  const user = await User.findOne({ refreshToken: token }).select('+refreshToken').populate('role');
  if (!user) throw new ApiError(401, 'Invalid refresh token');

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  setTokenCookies(res, accessToken, newRefreshToken);

  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, {
      message: 'Token refreshed successfully',
      accessToken,
    })
  );
});


exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No user found with this email');

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + constants.PASSWORD.RESET_TOKEN_EXPIRES;
  await user.save({ validateBeforeSave: false });

  //after send resetToken via email
  // For now return token in response 
  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, {
      message: 'Password reset token generated',
      resetToken, //  Remove this in production, send via email
    })
  );
});


exports.resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, { message: 'Password reset successful' })
  );
});


exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();

  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, { message: 'Password changed successfully' })
  );
});


exports.updateUser = asyncHandler(async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const loggedInUser = req.user;

    const { targetId } = checkOwnerOrAdmin(targetUserId, loggedInUser)

    const updates = { ...req.body };
    delete updates.password;
    delete updates.role;

    for (const key in updates) {
      if (updates[key] === undefined || updates[key] === '') {
        delete updates[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'At least one profile field is required');
    }

    const user = await User.findByIdAndUpdate(
      { _id: targetId },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) throw new ApiError(404, 'User not found');

    res.status(constants.STATUS.OK).json(
      new ApiResponse(constants.STATUS.OK, {
        message: 'Profile updated successfully',
        user,
      })
    );
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'Email already registered');
    }
    throw error
  }
});

// admin only can add user
exports.addUser = asyncHandler(async (req, res) => {

  const { userName, email, password, role, joiningDate } = req.body;

  if (role) {
    if (!mongoose.isValidObjectId(role)) {
      throw new ApiError(400,"invalid role id")
    }
  }

  if (!userName || !email || !password) {
    throw new ApiError(400, 'Missing required fields');
  }

  try {
    const user = await User.create({
      userName,
      email,
      password,
      joiningDate: joiningDate || new Date().toLocaleDateString('en-GB'),
      role: role ? role : ''
    });

    res.status(constants.STATUS.CREATED).json(
      new ApiResponse(constants.STATUS.CREATED, {
        message: 'User added successfully',
        user: {
          _id: user._id,
          joiningDate: user.joiningDate,
          userName: user.userName,
          email: user.email,
          isVerified: user.isVerified,
        },
      })
    );
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'Email already registered');
    }
    throw error;
  }
});

