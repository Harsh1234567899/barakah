const { asyncHandler } = require('devil-backend-nodejs');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Role = require('../models/rolesModel');
const RoleAccess = require('../models/roleAccessModel');
const { roleCache, ROLES_ACCESS_CACHE_KEY } = require('../config/cache');
const constants = require('../config/constants');
const Admin = require('../models/UserFlowModels/adminModel');
const Customer = require('../models/UserFlowModels/customerModel');
const User = require('../models/UserFlowModels/userModel');
const Vendor = require('../models/UserFlowModels/vendorModel');
const { generateCustomerCode, generateVendorCode, generateEMPcode } = require('../utils/otherUtils');

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

exports.getRolesWithPermission = asyncHandler(async (req, res) => {
  const rolesWithPermission = await RoleAccess.find().populate('role', 'name')
  if (!rolesWithPermission) {
    throw new ApiError(400, "failed the fatch the full roles and its permission ")
  }
  res.status(constants.STATUS.OK).json(
    new ApiResponse(constants.STATUS.OK, {
      message: "All Roles with permission fatched",
      rolesWithPermission
    })
  )
})

exports.addRolePermissions = asyncHandler(async (req, res) => {
  const { role, permissions } = req.body;

  if (typeof role !== 'string' || !role.trim()) {
    throw new ApiError(400, 'Role is required and must be a non-empty string');
  }

  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new ApiError(400, 'Permissions must be an object');
  }

  const normalizedRole = role.trim();
  let createdRole;
  let roleAccess;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const existingRole = await Role.findOne({ name: normalizedRole }).session(session);
      if (existingRole) {
        throw new ApiError(409, `Role '${normalizedRole}' already exists`);
      }

      [createdRole] = await Role.create([{ name: normalizedRole }], { session });
      [roleAccess] = await RoleAccess.create([{
        role: createdRole._id,
        permissions,
      }], { session });
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, `Role '${normalizedRole}' already exists`);
    }
    throw error;
  } finally {
    await session.endSession();
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
  const permissions = req.body?.permissions ?? req.body;

  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new ApiError(400, 'Permissions must be an object');
  }

  if (!mongoose.isValidObjectId(req.params.roleId)) {
    throw new ApiError(400, 'Invalid role ID');
  }

  const permissionUpdates = {};
  for (const [screen, actions] of Object.entries(permissions)) {
    if (!screen || screen.includes('.') || screen.startsWith('$') ||
        !actions || typeof actions !== 'object' || Array.isArray(actions)) {
      throw new ApiError(400, 'Each screen must contain an object of action permissions');
    }

    for (const [action, isAllowed] of Object.entries(actions)) {
      if (!action || action.includes('.') || action.startsWith('$') || typeof isAllowed !== 'boolean') {
        throw new ApiError(400, 'Permission actions must have valid names and boolean values');
      }
      permissionUpdates[`permissions.${screen}.${action}`] = isAllowed;
    }
  }

  if (Object.keys(permissionUpdates).length === 0) {
    throw new ApiError(400, 'At least one screen action permission is required to update');
  }

  const roleAccess = await RoleAccess.findOneAndUpdate(
    { role: req.params.roleId },
    { $set: permissionUpdates },
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


exports.adminUserRegister = asyncHandler(async (req, res) => {
  const { userName, email, password, role } = req.body;

  if (!userName || !email || !password) {
    throw new ApiError(400, 'userName, email, and password are required');
  }

  if (!role || !mongoose.isValidObjectId(role)) {
    throw new ApiError(400, 'A valid role ObjectId is required');
  }
  
  const session = await mongoose.startSession();
  let registeredUser;
  let registeredProfile = null;
  let registeredRoleName;

  try {
    await session.withTransaction(async () => {
      const selectedRole = await Role.findById(role).session(session);
      if (!selectedRole) {
        throw new ApiError(400, 'Selected role was not found');
      }

      const [user] = await User.create([{
        userName,
        email,
        password,
        joiningDate: String(new Date().toLocaleDateString('en-GB')),
        role: selectedRole._id,
      }], { session });

      switch (selectedRole.name.toLowerCase()) {
        case 'customer': {
          [registeredProfile] = await Customer.create([{
            user: user._id,
            customerCode: generateCustomerCode(),
          }], { session });
          break;
        }
        case 'vendor': {
          [registeredProfile] = await Vendor.create([{
            user: user._id,
            vendorCode: generateVendorCode(),
          }], { session });
          break;
        }
        case 'admin': {
          [registeredProfile] = await Admin.create([{
            user: user._id,
            employeeCode: generateEMPcode(),
          }], { session });
          break;
        }
        case 'super_admin': {
          if(req.user.role !== 'super_admin'){
            throw new ApiError(403,'only super admin can add super admin role user')
          }
          [registeredProfile] = await Admin.create([{
            user: user._id,
            employeeCode: generateEMPcode(),
          }], { session });
          break;
        }
        default:
          throw new ApiError(404,'your selected role not found')
      }

      if (!user) {
        throw new ApiError(400, 'Failed to create user');
      }

      registeredUser = user;
      registeredRoleName = selectedRole.name;
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        throw new ApiError(409, 'Email already registered');
      }
      if (error.keyPattern?.customerCode) {
        throw new ApiError(409, 'Could not create a unique customer code please retry');
      }
      if (error.keyPattern?.vendorCode) {
        throw new ApiError(409, 'Could not create a unique vendor code please retry');
      }
      if (error.keyPattern?.employeeCode) {
        throw new ApiError(409, 'Could not create a unique employee code please retry');
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
        role: registeredRoleName,
        profile: registeredProfile,
      },
    })
  );
});


// on role delete permisson also get delete bcs its link
// only permisson delete is not possible
// check if its delete request is for super admin or not

// exports.deleteRole = asyncHandler(async (req, res) => {
//   const { roleId } = req.body
//   const session = await mongoose.startSession();
//   if (!roleId || !isValidObjectId(roleId)) {
//     throw new ApiError(400, "No proper role provided")
//   }
//   // check if role is super admin or not
//   const checkRole = await Role.findById({_id : roleId})
//   if (checkRole.name === 'super_admin') {
//     throw new ApiError(400,`Super Admin Role Cant't be Deleted`)
//   }
//   try {
//     await session.withTransaction(async () => {
//       await Role.findOneAndDelete({ _id: roleId }).session(session)
//       await RoleAccess.findOneAndDelete({ role: roleId }).session(session)
//     })
//   } catch (error) {
//     throw error;
//   } finally {
//     await session.endSession();
//   }

//   roleCache.del(ROLES_ACCESS_CACHE_KEY);

//   res.status(constants.STATUS.OK).json(
//     new ApiResponse(constants.STATUS.OK, {
//       message: "role deleted successfully"
//     })
//   )
// })