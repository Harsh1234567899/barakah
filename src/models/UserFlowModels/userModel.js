const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const constants = require('../../config/constants');
const Role = require('../rolesModel');

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    joiningDate: {
      type: String,
      required: [true, 'Joining Date is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    passwordResetToken : {
      type: String,
      default : null
    },
    passwordResetExpires: {
      type: String,
      defualt: null
    }
  },
  {
    timestamps: true,
  }
);


userSchema.pre('validate', async function(next) {
  if (!this.role) {
    try {
      let roleQuery = Role.findOne({ name: constants.ROLES.CUSTOMER });
      const session = this.$session();
      if (session) roleQuery = roleQuery.session(session);

      const defaultRole = await roleQuery;
      if (defaultRole) {
        this.role = defaultRole._id;
      } else {
        return next(new Error('Default CUSTOMER role not found in the database. Please seed your roles.'));
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, constants.PASSWORD.SALT_ROUNDS);
  next();
});


// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
