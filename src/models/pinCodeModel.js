const mongoose = require('mongoose');

const pinCodeSchema = new mongoose.Schema({
    pincode: {
        type: Number,
        required: true,
        unique: true
    },
    city: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        required: true
    },
    state: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'State',
        required: true
    }
});

const PinCode = mongoose.model('PinCode', pinCodeSchema);
module.exports = PinCode;