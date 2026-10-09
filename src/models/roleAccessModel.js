const mongoose = require('mongoose');

const roleAccessSchema = new mongoose.Schema(
    {
        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true
        },
        permissions: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);
const RoleAccess = mongoose.model('RoleAccess', roleAccessSchema);

module.exports = RoleAccess;
