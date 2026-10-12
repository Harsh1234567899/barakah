const constants = require('../config/constants');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const { roleCache, ROLES_ACCESS_CACHE_KEY } = require('../config/cache');

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numbers = '0123456789';

const generateEMPcode = () => {
    let empCodeLetter = ''
    let empCodeNumber = ''

    // Generate 2 random letters
    for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * letters.length);
        empCodeLetter += letters[randomIndex];
    }
    // Generate 4 random numbers
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * numbers.length);
        empCodeNumber += numbers[randomIndex];
    }
    const empcode = empCodeLetter + empCodeNumber;
    return empcode;
}

const generateCustomerCode = () => {
    let customerCodeLetter = ''
    let customerCodeNumber = ''

    // Generate 2 random letters
    for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * letters.length);
        customerCodeLetter += letters[randomIndex];
    }
    // Generate 5 random numbers
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * numbers.length);
        customerCodeNumber += numbers[randomIndex];
    }
    const customercode = `CUST-${customerCodeLetter}${customerCodeNumber}`;
    return customercode;
}

const generateVendorCode = () => {
    let vendorCodeLetter = ''
    let vendorCodeNumber = ''

    // Generate 3 random letters
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * letters.length);
        vendorCodeLetter += letters[randomIndex];
    }
    // Generate 3 random numbers
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * numbers.length);
        vendorCodeNumber += numbers[randomIndex];
    }
    const vendorcode = `${vendorCodeLetter}-${vendorCodeNumber}`;
    return vendorcode;
}

const generateProductSKU = () => {
    let productSKULetter = ''
    let productSKUNumber = ''
    // Generate 2 random letters
    for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * letters.length);
        productSKULetter += letters[randomIndex];
    }
    // Generate 4 random numbers
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * numbers.length);
        productSKUNumber += numbers[randomIndex];
    }
    const productSKU = `${productSKULetter}-${productSKUNumber}`;
    return productSKU;
}

const checkOwnerOrAdmin = (targetId, requestUser) => {
    if (!mongoose.isValidObjectId(targetId)) {
        throw new ApiError(400, 'Invalid user ID');
    }

    if (!requestUser) {
        throw new ApiError(401, 'Authentication required');
    }

    const isOwner = String(requestUser.id || requestUser._id) === String(targetId);
    const permissionMatrix = roleCache.get(ROLES_ACCESS_CACHE_KEY) || {};
    const isAdminOrSuperAdmin = [constants.ROLES.ADMIN, constants.ROLES.SUPER_ADMIN]
        .some((roleName) => requestUser.role === roleName && Object.hasOwn(permissionMatrix, roleName));

    if (!isOwner && !isAdminOrSuperAdmin) {
        throw new ApiError(403, 'You are not authorized to perform this task');
    }

    return { targetId, isOwner, isAdminOrSuperAdmin };
}

module.exports = {
    generateEMPcode,
    generateVendorCode,
    generateProductSKU,
    generateCustomerCode,
    checkOwnerOrAdmin,
}
