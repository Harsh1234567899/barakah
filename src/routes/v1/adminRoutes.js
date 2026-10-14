const express = require('express');
const { protect ,authorize } = require('../../middleware/authMiddleware');
const { checkAccess } = require('../../middleware/rbacMiddleware');
const {
  getRoles,
  addRolePermissions,
  updateRolePermissions,
  adminUserRegister,
  getRolesWithPermission
} = require('../../controllers/adminController');

const router = express.Router();

router.get(
  '/get-roles',
  protect,
  authorize('admin', 'super_admin'),
  getRoles
);

router.get(
  '/get-roles-permission',
  protect,
  authorize('admin','super_admin'),
  getRolesWithPermission
)

router.post(
  '/roles',
  protect,
  authorize('admin', 'super_admin'),
  addRolePermissions
);

router.post(
  '/create-user',
  protect,
  authorize('admin', 'super_admin'),
  adminUserRegister
);


router.patch(
  '/roles/:roleId/access',
  protect,
  authorize('admin','super_admin'),
  updateRolePermissions
);

module.exports = router;