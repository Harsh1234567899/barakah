const Customer = require('../../models/UserFlowModels/customerModel');
const User = require('../../models/UserFlowModels/userModel');
const mongoose = require('mongoose');
const State = require('../../models/stateModal');
const City = require('../../models/cityModel');
const PinCode = require('../../models/pinCodeModel');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const { asyncHandler } = require('devil-backend-nodejs');
const constants = require('../../config/constants');
const { uploadOnCloudinary, deleteOnCloudinary } = require('../../utils/Cloudinary');
const { checkOwnerOrAdmin } = require('../../utils/otherUtils');

// admin only route to get all customers 
// later populate order
exports.getCustomers = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
        constants.PAGINATION.MAX_LIMIT,
        Math.max(1, parseInt(req.query.limit, 10) || constants.PAGINATION.DEFAULT_LIMIT)
    );
    const sortableFields = ['createdAt', 'city', 'state'];
    const sortBy = sortableFields.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const customerStages = [];
    const lookupStages = [
        {
            $lookup: {
                from: User.collection.name,
                localField: 'user',
                foreignField: '_id',
                pipeline: [{ $project: { _id: 1, userName: 1, email: 1, joiningDate: 1 } }],
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: State.collection.name,
                localField: 'state',
                foreignField: '_id',
                pipeline: [{ $project: { _id: 0, state: 1 } }],
                as: 'state',
            },
        },
        { $unwind: { path: '$state', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: City.collection.name,
                localField: 'city',
                foreignField: '_id',
                pipeline: [{ $project: { _id: 0, city: 1 } }],
                as: 'city',
            },
        },
        { $unwind: { path: '$city', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: PinCode.collection.name,
                localField: 'pincode',
                foreignField: '_id',
                pipeline: [{ $project: { _id: 0, pincode: 1 } }],
                as: 'pincode',
            },
        },
        { $unwind: { path: '$pincode', preserveNullAndEmptyArrays: true } },
    ];

    if (sortBy === 'city' || sortBy === 'state') {
        customerStages.push(
            ...lookupStages,
            { $sort: { [`${sortBy}.${sortBy}`]: sortOrder, _id: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        );
    } else {
        customerStages.push(
            { $sort: { [sortBy]: sortOrder, _id: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            ...lookupStages
        );
    }

    customerStages.push(
        {
            $project: {
                _id: 1,
                user: 1,
                customerCode: 1,
                avatar: 1,
                state: 1,
                city: 1,
                pincode: 1,
                phoneNumber: 1,
                alternateNumber: 1,
                createdAt: 1,
            },
        }
    );

    const [result] = await Customer.aggregate([
        {
            $facet: {
                customers: customerStages,
                metadata: [{ $count: 'totalCustomers' }],
            },
        },
    ]);
    const totalCustomers = result.metadata[0]?.totalCustomers || 0;
    const customers = result.customers;

    res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, {
            customers,
            totalCustomers,
            page,
            limit,
            totalPages: Math.ceil(totalCustomers / limit),
            sortBy,
            sortOrder: sortOrder === 1 ? 'asc' : 'desc',
        })
    );
});
// admin and customer can access this route to get profile
// later populate order
exports.getCustomerById = asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const loggedInUser = req.user;
    const { targetId } = checkOwnerOrAdmin(targetUserId, loggedInUser);
    const customer = await Customer.findOne({ user: targetId }).populate([
        { path: 'user', populate: { path: 'role', select: 'name' }, },
        { path: 'state', select: 'state', },
        { path: 'city', select: 'city' },
        { path: 'pincode', select: 'pincode' },
        { path: 'orders' }
    ]);
    if (!customer) {
        throw new ApiError(404, 'Customer not found');
    }
    res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, { customer })
    );
});

exports.updateCustomer = asyncHandler(async (req, res) => {
    const { targetId } = checkOwnerOrAdmin(req.params.id, req.user);
    const userUpdates = {};
    const customerUpdates = {};

    for (const field of ['userName', 'email']) {
        if (req.body[field] !== undefined && req.body[field] !== '') {
            userUpdates[field] = typeof req.body[field] === 'string'
                ? req.body[field].trim()
                : req.body[field];
        }
    }

    if (userUpdates.email) {
        userUpdates.email = userUpdates.email.toLowerCase();
    }

    for (const field of ['address', 'state', 'city', 'pincode', 'phoneNumber', 'alternateNumber']) {
        if (req.body[field] !== undefined && req.body[field] !== '') {
            customerUpdates[field] = req.body[field];
        }
    }

    const uploadedAvatar = req.files?.avatar?.[0];
    let uploadedAvatarUrl;
    if (uploadedAvatar?.path) {
        const uploadResult = await uploadOnCloudinary(uploadedAvatar.path, 'barakashAvatars');
        if (!uploadResult?.secure_url) {
            throw new ApiError(502, 'Avatar upload failed');
        }
        uploadedAvatarUrl = uploadResult.secure_url;
        customerUpdates.avatar = uploadedAvatarUrl;
    }

    if (Object.keys(userUpdates).length === 0 && Object.keys(customerUpdates).length === 0) {
        throw new ApiError(400, 'At least one profile field or an avatar is required');
    }

    const session = await mongoose.startSession();
    let updatedUser;
    let updatedCustomer;
    try {
        await session.withTransaction(async () => {

            updatedUser = Object.keys(userUpdates).length
                ? await User.findByIdAndUpdate(
                    targetId,
                    { $set: userUpdates },
                    { new: true, runValidators: true, session }
                )
                : null

            updatedCustomer = Object.keys(customerUpdates).length
                ? await Customer.findOneAndUpdate(
                    { user: targetId },
                    { $set: customerUpdates },
                    { new: true, runValidators: true, session }
                )
                : null;
        });
    } catch (error) {
        if (uploadedAvatarUrl) {
            try {
                await deleteOnCloudinary(uploadedAvatarUrl);
            } catch (cleanupError) {
                console.warn('Failed to clean up an avatar after customer update rollback.');
            }
        }
        if (error.code === 11000 && userUpdates.email) {
            throw new ApiError(409, 'This email is already in use by another user');
        }
        throw error;
    } finally {
        await session.endSession();
    }


    res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, {
            message: 'Customer profile updated successfully',
            user: updatedUser || 'user docuemnt have no update filed',
            customer: updatedCustomer || 'customer docuemnt have no update filed',
        })
    );
});

exports.deleteCustomer = asyncHandler(async (req, res) => {
    const { targetId } = checkOwnerOrAdmin(req.params.id, req.user);

    const session = await mongoose.startSession();
    let avatarUrl;
    try {
        await session.withTransaction(async () => {
            const customer = await Customer.findOne({ user: targetId })
                .select('avatar')
                .session(session);
            if (!customer) throw new ApiError(404, 'Customer not found');
            avatarUrl = customer.avatar;

            const customerDeletion = await Customer.deleteMany({ user: targetId }, { session });
            if (customerDeletion.deletedCount === 0) {
                throw new ApiError(404, 'Customer not found');
            }

            const userDeletion = await User.deleteOne({ _id: targetId }, { session });
            if (userDeletion.deletedCount !== 1) {
                throw new ApiError(404, 'User not found; customer deletion was cancelled');
            }
        });
    } finally {
        await session.endSession();
    }

    let avatarCleanupFailed = false;
    if (avatarUrl) {
        try {
            await deleteOnCloudinary(avatarUrl);
        } catch (error) {
            avatarCleanupFailed = true;
            console.warn('Customer was deleted, but Cloudinary avatar cleanup failed.');
        }
    }

    res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, {
            message: 'Customer and linked user deleted successfully',
            avatarCleanupFailed,
        })
    );
})


