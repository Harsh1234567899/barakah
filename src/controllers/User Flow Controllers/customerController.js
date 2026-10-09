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
const { uploadOnCloudinary } = require('../../utils/Cloudinary');

// admin only route to get all customers 
// later populate order
exports.getCustomers = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
        constants.PAGINATION.MAX_LIMIT,
        Math.max(1, parseInt(req.query.limit, 10) || constants.PAGINATION.DEFAULT_LIMIT)
    );
    const sortableFields = ['createdAt', 'customerCode', 'city', 'state'];
    const sortBy = sortableFields.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [result] = await Customer.aggregate([
        {
            $facet: {
                customers: [
                    { $sort: { [sortBy]: sortOrder } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
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
                    },
                ],
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
    const loggedInUser = req.user.id;
    const { targetId } = checkOwnerOrAdmin(targetUserId, loggedInUser)
    const customer = await Customer.findById({ user: targetId }).populate([
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

exports.updateCustommer = asyncHandler(async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const loggedInUser = req.user.id;
        const { targetId } = checkOwnerOrAdmin(targetUserId, loggedInUser)
        const updates = { ...req.body };
        delete updates.password;
        delete updates.customerCode;
        delete updates.user
        if (isOwner) {
            delete updates.role;
        }

        for (const key in updates) {
            if (updates[key] === undefined || updates[key] === '' || updates[key] === NaN) {
                delete updates[key];
            }
        }

        if (Object.keys(updates).length === 0 && !req.file) {
            throw new ApiError(400, 'At least one profile field or an avatar is required to update');
        }

        if (updates.email) {
            if (updates.userName) {
                await User.findByIdAndUpdate({ _id: targetId }, { email: updates.email, userName: updates.username }, { new: true }, { runValidators: false });
            }
            await User.updateOne({ email: updates.email, _id: { $ne: targetId } });
        }
        const uploadedAvatar = req.files?.avatar?.[0];
        if (uploadedAvatar?.path) {
            const uploadFile = await uploadOnCloudinary(uploadedAvatar.path, 'barakashAvatars');
            updates.avatar = uploadFile.secure_url || null;
        }

        const customer = await Customer.findByIdAndUpdate({ _id: targetId }, updates, {
            new: true,
            runValidators: true,
        });

        if (!customer) throw new ApiError(404, 'User not found');

        res.status(constants.STATUS.OK).json(
            new ApiResponse(constants.STATUS.OK, {
                message: 'Profile updated successfully',
                customer,
            })
        );
    } catch (error) {
        if (error.code === 11000) {
            console.log("This email is already taken by another user!");
        }

    }
})

exports.deleteCustomer = asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const loggedInUser = req.user.id;
    const { targetId } = checkOwnerOrAdmin(targetUserId, loggedInUser)


    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const customerDeletion = await Customer.deleteOne({ user: targetId }, { session });
            if (customerDeletion.deletedCount === 0) {
                throw new ApiError(404, 'Customer not found');
            }
            // other details also can delete if needed ask sir first
            const userDeletion = await User.deleteOne({ _id: targetId }, { session });
            if (userDeletion.deletedCount !== 1) {
                throw new ApiError(404, 'User not found; customer deletion was cancelled');
            }
        });
    } finally {
        await session.endSession();
    }

    res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, {
            message: 'Customer and linked user deleted successfully',
        })
    );
})


