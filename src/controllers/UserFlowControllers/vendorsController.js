const mongoose = require("mongoose");
const User = require("../../models/UserFlowModels/userModel");
const Vendor = require("../../models/UserFlowModels/vendorModel");
const Role = require("../../models/rolesModel");
const State = require("../../models/stateModal");
const City = require("../../models/cityModel");
const PinCode = require("../../models/pinCodeModel");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const { checkOwnerOrAdmin, generateVendorCode } = require("../../utils/otherUtils");
const { asyncHandler } = require("devil-backend-nodejs");
const constants = require("../../config/constants");
const { uploadOnCloudinary, deleteOnCloudinary } = require("../../utils/Cloudinary");

exports.getVendors = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
        constants.PAGINATION.MAX_LIMIT,
        Math.max(1, parseInt(req.query.limit, 10) || constants.PAGINATION.DEFAULT_LIMIT)
    );
    const sortableFields = ['createdAt', 'vendorCode', 'BrandName', 'city', 'state'];
    const sortBy = sortableFields.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

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

    const vendorStages = [];
    if (sortBy === 'city' || sortBy === 'state') {
        vendorStages.push(
            ...lookupStages,
            { $sort: { [`${sortBy}.${sortBy}`]: sortOrder, _id: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        );
    } else {
        vendorStages.push(
            { $sort: { [sortBy]: sortOrder, _id: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            ...lookupStages
        );
    }

    vendorStages.push({
        $project: {
            _id: 1,
            user: 1,
            vendorCode: 1,
            avatar: 1,
            GSTNumber: 1,
            PANNumber: 1,
            BrandName: 1,
            address: 1,
            state: 1,
            city: 1,
            pincode: 1,
            phoneNumber: 1,
            vendorStatus: 1,
            createdAt: 1,
        },
    });

    const [result] = await Vendor.aggregate([
        {
            $facet: {
                vendors: vendorStages,
                metadata: [{ $count: 'totalVendors' }],
            },
        },
    ]);
    const totalVendors = result.metadata[0]?.totalVendors || 0;

    res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, {
            vendors: result.vendors,
            totalVendors,
            page,
            limit,
            totalPages: Math.ceil(totalVendors / limit),
            sortBy,
            sortOrder: sortOrder === 1 ? 'asc' : 'desc',
        })
    );
});

exports.getVendorById = asyncHandler(async (req, res) => {
    const { targetId } = checkOwnerOrAdmin(req.params.id, req.user);
    const vendor = await Vendor.findOne({ user: targetId })
        .select('-products')
        .populate([
            { path: 'user', select: 'userName email joiningDate role', populate: { path: 'role', select: 'name' } },
            { path: 'state', select: 'state' },
            { path: 'city', select: 'city' },
            { path: 'pincode', select: 'pincode' },
        ]);

    if (!vendor) throw new ApiError(404, 'Vendor not found');

    res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, { vendor })
    );
});

// after product model created add here to add new product while update 
exports.updateVendor = asyncHandler(async (req, res) => {
    const { targetId } = checkOwnerOrAdmin(req.params.id, req.user);
    const userUpdates = {};
    const vendorUpdates = {};

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

    for (const field of ['address', 'state', 'city', 'pincode', 'phoneNumber', 'PANNumber', 'BrandName', 'GSTNumber']) {
        if (req.body[field] !== undefined && req.body[field] !== '') {
            vendorUpdates[field] = req.body[field];
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
        vendorUpdates.avatar = uploadedAvatarUrl;
    }

    if (Object.keys(userUpdates).length === 0 && Object.keys(vendorUpdates).length === 0) {
        throw new ApiError(400, 'At least one profile field or an avatar is required');
    }

    const session = await mongoose.startSession();
    let updatedUser;
    let updatedVendor;
    try {
        await session.withTransaction(async () => {

            if (Object.keys(userUpdates).length > 0) {
                updatedUser = await User.findByIdAndUpdate(
                    targetId,
                    { $set: userUpdates },
                    { new: true, runValidators: true, session }
                )
                if (!updatedUser) throw new ApiError(404, 'User not found');
            }

            if (Object.keys(vendorUpdates).length > 0) {
                updatedVendor = await Vendor.findOneAndUpdate(
                    { user: targetId },
                    { $set: vendorUpdates },
                    { new: true, runValidators: true, session })
                if (!updatedVendor) throw new ApiError(404, 'vendor not found');
            }
        });
    } catch (error) {
        if (uploadedAvatarUrl) {
            try {
                await deleteOnCloudinary(uploadedAvatarUrl)
            } catch (cleanupError) {
                console.warn('Failed to clean up an avatar or KYC after vendor update rollback.');
            }
        }
        if (error.code === 11000 && userUpdates.email) {
            throw new ApiError(409, 'This email is already in use by another user');
        }
        throw error;
    } finally {
        await session.endSession();
    }


    return res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, {
            message: 'Vendor profile updated successfully',
            user: updatedUser || 'user docuemnt have no update filed',
            customer: updatedVendor || 'vendor docuemnt have no update filed',
        })
    );
});

exports.deleteVendor = asyncHandler(async (req, res) => {
    const { targetId } = checkOwnerOrAdmin(req.params.id, req.user)

    const session = await mongoose.startSession();
    let deletedUser;
    let vendor

    try {
        await session.withTransaction(async () => {

            vendor = await Vendor.findOne({ user: targetId }).session(session)
            if (!vendor) {
                throw new ApiError(400, 'vendor profile not found')
            }

            deletedUser = await User.findByIdAndDelete(targetId).session(session)
            if (!deletedUser) {
                throw new ApiError(400, 'vendor profile not found in user model')
            }

            await Vendor.findOneAndDelete({ user: targetId }).session(session)
            // after add product also 
        });
    } finally {
        await session.endSession();
    }

    for (const url of [vendor.avatar, vendor.KYCdocs].filter(Boolean)) {
        try {
            await deleteOnCloudinary(url);
        } catch (error) {
            console.warn('Vendor was deleted, but Cloudinary cleanup failed.');
        }
    }

    return res.status(constants.STATUS.OK).json(
        new ApiResponse(constants.STATUS.OK, {
            message: 'Vendor and linked user deleted successfully',
        })
    );
})

exports.createVendor = asyncHandler(async (req, res) => {
    const { userName, email, password, joiningDate, GSTNumber, PANNumber, BrandName } = req.body;
    if (!userName || !email || !password || !GSTNumber || !PANNumber || !BrandName) {
        throw new ApiError(400, 'userName, email, password, GSTNumber, PANNumber, and BrandName are required');
    }

    const uploadedFiles = [
        { file: req.files?.avatar?.[0], field: 'avatar', folder: 'barakashVendors' },
        { file: req.files?.KYCdocs?.[0], field: 'KYCdocs', folder: 'barakashVendorKyc' },
    ];
    const uploadedUrls = {};
    let session;
    let createdUser;
    let createdVendor;

    try {
        for (const { file, field, folder } of uploadedFiles) {
            if (!file?.path) continue;
            const uploadResult = await uploadOnCloudinary(file.path, folder);
            if (!uploadResult?.secure_url) {
                throw new ApiError(502, `${field} upload failed`);
            }
            uploadedUrls[field] = uploadResult.secure_url;
        }

        session = await mongoose.startSession();
        await session.withTransaction(async () => {
            const vendorRole = await Role.findOne({ name: constants.ROLES.VENDOR }).session(session);
            if (!vendorRole) {
                throw new ApiError(500, 'Vendor role is not configured');
            }

            [createdUser] = await User.create([{
                userName: userName.trim(),
                email: email.trim().toLowerCase(),
                password,
                joiningDate: joiningDate || String(new Date().toLocaleDateString('en-GB')),
                role: vendorRole._id,
            }], { session });
            if (!createdUser) {
                throw new ApiError(400, 'faild to create the user profile for vendor')
            }

            [createdVendor] = await Vendor.create([{
                user: createdUser._id,
                vendorCode: generateVendorCode(),
                GSTNumber: GSTNumber.trim(),
                PANNumber: PANNumber.trim(),
                BrandName: BrandName.trim(),
                address: req.body.address?.trim() || null,
                state: req.body.state || null,
                city: req.body.city || null,
                pincode: req.body.pincode || null,
                phoneNumber: req.body.phoneNumber?.trim() || null,
                avatar: uploadedUrls.avatar || null,
                KYCdocs: uploadedUrls.KYCdocs || null,
            }], { session });
            if (!createdVendor) {
                throw new ApiError(400, 'faild to create the user profile for vendor')
            }
            
        });
    } catch (error) {
        for (const url of Object.values(uploadedUrls)) {
            try {
                await deleteOnCloudinary(url);
            } catch (cleanupError) {
                console.warn('Vendor registration failed and a Cloudinary upload could not be cleaned up.');
            }
        }

        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern || {})[0];
            throw new ApiError(409, `${duplicateField || 'Vendor field'} already exists`);
        }
        throw error;
    } finally {
        if (session) await session.endSession();
    }

    return res.status(constants.STATUS.CREATED).json(
        new ApiResponse(constants.STATUS.CREATED, {
            message: 'Vendor created successfully',
            user: {
                _id: createdUser._id,
                userName: createdUser.userName,
                email: createdUser.email,
                joiningDate: createdUser.joiningDate,
                role: constants.ROLES.VENDOR
            },
            vendor: createdVendor,
        })
    );
});
