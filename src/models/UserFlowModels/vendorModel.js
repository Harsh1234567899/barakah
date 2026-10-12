const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vendorCode: {
        type: String,
        required: [true, 'Vendor Code is required'],
        unique: true
    },
    avatar: {
        type: String,
        default: null
    },
    GSTNumber: {
        type: String,
        default : null,
        unique : true
    },
    PANNumber: {
        type: String,
        default : null,
        unique : true
    },
    BrandName: {
        type: String,
        required: [true, 'Brand Name is required'],
    },
    address: {
        type: String,
        trim: true,
        default: null
    },
    state: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'State',
        default: null
    },
    city: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        default: null
    },
    pincode: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PinCode',
        default: null
    },
    phoneNumber: {
        type: String,
        trim: true,
        minlength: [7, 'Phone number must be at least 7 characters'],
        maxlength: [20, 'Phone number cannot exceed 20 characters'],
        default: null
    },
    alternateNumber: {
        type: String,
        trim: true,
        minlength: [7, 'Alternate number must be at least 7 characters'],
        maxlength: [20, 'Alternate number cannot exceed 20 characters'],
        default: null
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
    KYCdocs: {
        type: String,
        default: null
    },
    vendorStatus: {
        type: String,
        enum: ['Active', 'Inactive', 'Blacklisted'],
        default: 'Pending'
    }
}, { timestamps: true });

const Vendor = mongoose.model('Vendor', vendorSchema);
module.exports = Vendor;