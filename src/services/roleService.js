const Role = require('../models/rolesModel');
const RoleAccess = require('../models/roleAccessModel');
const { roleCache, ROLES_ACCESS_CACHE_KEY } = require('../config/cache');

const getAllRolePermissions = async () => {
  const rows = await Role.aggregate([
    {
      $lookup: {
        from: RoleAccess.collection.name,
        localField: '_id',
        foreignField: 'role',
        as: 'accessRows',
      },
    },
    { $unwind: { path: '$accessRows', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        roleName: '$name',
        permissions: { $ifNull: ['$accessRows.permissions', {}] },
      },
    },
  ]);

  const matrix = {};

  for (const { roleName, permissions } of rows) {
    if (typeof roleName !== 'string' || !permissions || typeof permissions !== 'object') continue;

    matrix[roleName] ??= {};
    for (const [screen, actions] of Object.entries(permissions)) {
      if (!actions || typeof actions !== 'object' || Array.isArray(actions)) continue;
      matrix[roleName][screen] = { ...matrix[roleName][screen], ...actions };
    }
  }

  return matrix;
};

const preloadRolePermissions = async () => {
  const matrix = await getAllRolePermissions();
  roleCache.set(ROLES_ACCESS_CACHE_KEY, matrix);
  return matrix;
};

module.exports = { getAllRolePermissions, preloadRolePermissions };