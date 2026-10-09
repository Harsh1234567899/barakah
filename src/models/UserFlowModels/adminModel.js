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
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;