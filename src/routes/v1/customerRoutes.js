const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { checkAccess } = require('../../middleware/rbacMiddleware');
const { upload } = require('../../middleware/multerMiddleware');
const {
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require('../../controllers/UserFlowControllers/customerController');

const router = express.Router();

router.get('/', protect, checkAccess('customers', 'view'), getCustomers);
router.get('/:id', protect, getCustomerById);
router.patch(
  '/:id',
  protect,
  upload.fields([{ name: 'avatar', maxCount: 1 }]),
  updateCustomer
);
router.delete('/:id', protect, deleteCustomer);

module.exports = router;