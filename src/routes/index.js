const express = require('express');
const router = express.Router();

// Import all routes
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const customerRoutes = require('./customerRoutes');
const addressRoutes = require('./addressRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/customers', customerRoutes);
router.use('/addresses', addressRoutes);

// Add more routes here as your app grows
// router.use('/users', userRoutes);
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);

module.exports = router;
