const { asyncHandler } = require('devil-backend-nodejs');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Role = require('../models/rolesModel');
const RoleAccess = require('../models/roleAccessModel');
const { roleCache, ROLES_ACCESS_CACHE_KEY } = require('../config/cache');
const constants = require('../config/constants');

// applied stric role only admin or super admin can access this route
exports.getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort({ name: 1 });

  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, {
      message: 'Roles retrieved successfully',
      roles,
    })
  );
});

exports.addRolePermissions = asyncHandler(async (req, res) => {
  const { role, permissions } = req.body;

  if (typeof role !== 'string' || !role.trim()) {
    throw new ApiError(400, 'Role is required and must be a non-empty string');
  }

  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new ApiError(400, 'Permissions must be an object');
  }

  const normalizedRole = role.trim();
  const existingRole = await Role.findOne({ name: normalizedRole });
  if (existingRole) {
    throw new ApiError(409, `Role '${normalizedRole}' already exists`);
  }

  let createdRole;
  let roleAccess;

  try {
    createdRole = await Role.create({ name: normalizedRole });
    roleAccess = await RoleAccess.create({
      role: createdRole._id,
      permissions,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, `Role '${computedRole}' already exists`);
    }
    throw error;
  }

  roleCache.del(ROLES_ACCESS_CACHE_KEY);

  res.status(constants.STATUS.CREATED).json(
    new ApiResponse(constants.STATUS.CREATED, {
      message: 'Role and permissions added successfully',
      role: createdRole,
      roleAccess,
    })
  );
});

exports.updateRolePermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new ApiError(400, 'Permissions must be an object');
  }

  const roleAccess = await RoleAccess.findOneAndUpdate(
    { role: req.params.roleId },
    { $set: { permissions } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  roleCache.del(ROLES_ACCESS_CACHE_KEY);

  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, {
      message: 'Role permissions updated successfully',
      roleAccess,
    })
  );
});