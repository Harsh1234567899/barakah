const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  updateUser,
} = require('../controllers/UserFlowControllers/authController.js');
const {upload} = require('../middleware/multerMiddleware.js');
const { protect } = require('../middleware/authMiddleware.js');


router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/refresh-token', refreshToken);


router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.patch(
  '/update-profile/:id',
  protect,
  upload.fields([{ name: 'avatar', maxCount: 1 }]),
  updateUser
);

module.exports = router;
