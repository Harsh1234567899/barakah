const ApiError = require('../utils/ApiError');
const { roleCache, ROLES_ACCESS_CACHE_KEY } = require('../config/cache');
const { getAllRolePermissions } = require('../services/roleService');

let permissionsLoadPromise;

const getPermissionMatrix = async () => {
  if (roleCache.has(ROLES_ACCESS_CACHE_KEY)) {
    return roleCache.get(ROLES_ACCESS_CACHE_KEY);
  }

  if (!permissionsLoadPromise) {
    permissionsLoadPromise = getAllRolePermissions()
      .then((matrix) => {
        roleCache.set(ROLES_ACCESS_CACHE_KEY, matrix);
        return matrix;
      })
      .finally(() => {
        permissionsLoadPromise = undefined;
      });
  }

  return permissionsLoadPromise;
};

const checkAccess = (requiredScreen, requiredAction) => async (req, res, next) => {
  try {
    if (!req.user) throw new ApiError(401, 'Authentication required');

    const userRole = req.user.role;
    if (typeof userRole !== 'string' || !userRole) {
      throw new ApiError(403, 'User role is not available');
    }

    const matrix = await getPermissionMatrix();
    const rolePermissions = Object.hasOwn(matrix, userRole) ? matrix[userRole] : undefined;
    const screenPermissions = rolePermissions && Object.hasOwn(rolePermissions, requiredScreen)
      ? rolePermissions[requiredScreen]
      : undefined;
    const isAllowed = screenPermissions && Object.hasOwn(screenPermissions, requiredAction)
      && screenPermissions[requiredAction] === true;

    if (!isAllowed) {
      throw new ApiError(403, `Access denied for ${requiredAction} on ${requiredScreen}`);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkAccess };