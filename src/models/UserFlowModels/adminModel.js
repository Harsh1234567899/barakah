const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employeeCode: {
        type: String,
        required: [true, 'Employee Code is required'],
        unique: true
    },
    avatar: {
        type: String,
        default: null
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
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;