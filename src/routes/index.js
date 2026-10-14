const express = require('express');
const router = express.Router();

const authRoutes = require('./v1/authRoutes.js');
const adminRoutes = require('./v1/adminRoutes.js');
const customerRoutes = require('./v1/customerRoutes.js');
const addressRoutes = require('./v1/addressRoutes.js');
const vendorRoutes = require('./v1/vendorRoutes.js');


router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/customers', customerRoutes);
router.use('/addresses', addressRoutes);
router.use('/vendors', vendorRoutes);


module.exports = router;
