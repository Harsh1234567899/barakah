const express = require('express');
const { authorize, protect } = require('../../middleware/authMiddleware');
const {
  createState,
  createCity,
  createPinCode,
  getStates,
  getCities,
  getPinCodes,
} = require('../../controllers/addressController');

const router = express.Router();
const adminOnly = [protect, authorize('admin', 'super_admin')];

router.get('/states', getStates);
router.get('/cities', getCities);
router.get('/pincodes', getPinCodes);
router.post('/states', ...adminOnly, createState);
router.post('/cities', ...adminOnly, createCity);
router.post('/pincodes', ...adminOnly, createPinCode);

module.exports = router;