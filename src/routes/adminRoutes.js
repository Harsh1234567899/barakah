const express = require('express');
const { protect ,authorize } = require('../middleware/authMiddleware');
const { checkAccess } = require('../middleware/rbacMiddleware');
const {
  getRoles,
  addRolePermissions,
  updateRolePermissions,
  adminUserRegister,
} = require('../controllers/adminController');

const router = express.Router();

router.get(
  '/get-roles',
  protect,
  authorize('admin', 'super_admin'),
  getRoles
);

router.post(
  '/roles',
  protect,
  authorize('admin', 'super_admin'),
  addRolePermissions
);

router.post(
  '/users',
  protect,
  authorize('admin', 'super_admin'),
  adminUserRegister
);


router.patch(
  '/roles/:roleId/access',
  protect,
  checkAccess('roles', 'edit'),
  updateRolePermissions
);

module.exports = router;