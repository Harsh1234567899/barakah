const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const customerRoutes = require('./customerRoutes');
const addressRoutes = require('./addressRoutes');
const vendorRoutes = require('./vendorRoutes.js');


router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/customers', customerRoutes);
router.use('/addresses', addressRoutes);
router.use('/vendors', vendorRoutes);


module.exports = router;
