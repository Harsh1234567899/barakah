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
        required: [true, 'GST Number is required'],
    },
    PANNumber: {
        type: String,
        required: [true, 'PAN Number is required'],
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
      type: Number,
      minlength: [10, 'Phone number must be at least 10 digits'],
      trim: true,
      default: null
    },
    alternateNumber: {
      type: Number,
      minlength: [10, 'Alternate number must be at least 10 digits'],
      trim: true,
      default: null
    },
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    }],
    KYCdocs: {
        type: String,
        required: [true, 'KYC documents are required'],
    },
    vendorStatus: {
      type: String,
      enum: ['Active', 'Inactive', 'Blacklisted'],
      default: 'Pending'
    }
}, {timestamps: true});

const Vendor = mongoose.model('Vendor', vendorSchema);
module.exports = Vendor;