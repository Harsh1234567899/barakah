const express = require('express');
const { protect ,authorize } = require('../middleware/authMiddleware');
const { checkAccess } = require('../middleware/rbacMiddleware');
const {
  getRoles,
  addRolePermissions,
  updateRolePermissions,
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

router.get(
  '/users',
  protect,
  checkAccess('users', 'view'),
  getUsers
);

router.patch(
  '/roles/:roleId/access',
  protect,
  checkAccess('roles', 'edit'),
  updateRolePermissions
);

module.exports = router;