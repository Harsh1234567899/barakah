const express = require('express');
const { protect, authorize } = require('../../middleware/authMiddleware');
const { checkAccess } = require('../../middleware/rbacMiddleware');
const { upload } = require('../../middleware/multerMiddleware');
const {
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  createVendor,
} = require('../../controllers/UserFlowControllers/vendorsController');

const router = express.Router();

router.get('/', protect, checkAccess('vendors', 'view'), getVendors);
router.get('/:id', protect, getVendorById);
router.patch(
  '/:id',
  protect,
  upload.fields([{ name: 'avatar', maxCount: 1 }]),
  updateVendor
);
router.delete('/:id', protect, deleteVendor);
router.post(
  '/',
  protect,
  authorize('admin', 'super_admin'),
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'KYCdocs', maxCount: 1 },
  ]),
  createVendor
);

module.exports = router;
