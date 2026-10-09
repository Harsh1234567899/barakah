const stateModel = require('../models/stateModal');
const cityModel = require('../models/cityModel');
const pinCodeModel = require('../models/pinCodeModel');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('devil-backend-nodejs');
const ApiResponse = require('../utils/ApiResponse');


exports.createState = asyncHandler(async (req, res) => {
  const { state } = req.body;
  if (!state || typeof state !== 'string' || !state.trim()) {
    throw new ApiError(400, 'State is required and must be a non-empty string')
  }

  const createdState = await stateModel.create({ state: state.trim() });
  if (!createdState) {
    throw new ApiError(500, 'Failed to create state');
  }
  res.status(201).json(new ApiResponse(201, { message: 'State created successfully', state: createdState }));
});

exports.createCity = asyncHandler(async (req, res) => {
  const { city, state } = req.body;
  if (!city || typeof city !== 'string' || !city.trim()) {
    throw new ApiError(400, 'City is required and must be a non-empty string');
  }
  if (!state || typeof state !== 'string' || !state.trim()) {
    throw new ApiError(400, 'State is required and must be a non-empty string');
  }
  const createdCity = await cityModel.create({ city: city.trim(), state: state.trim() });
  if (!createdCity) {
    throw new ApiError(500, 'Failed to create city');
  }
  res.status(201).json(new ApiResponse(201, { message: 'City created successfully', city: createdCity }));
});

exports.createPinCode = asyncHandler(async (req, res) => {
  const { pincode, city, state } = req.body;
  if (!pincode || typeof pincode !== 'string' || !pincode.trim()) {
    throw new ApiError(400, 'PinCode is required and must be a non-empty string');
  }
  if (!city || typeof city !== 'string' || !city.trim()) {
    throw new ApiError(400, 'City is required and must be a non-empty string');
  }
  if (!state || typeof state !== 'string' || !state.trim()) {
    throw new ApiError(400, 'State is required and must be a non-empty string');
  }
  const createdPinCode = await pinCodeModel.create({ pincode: pincode.trim(), city: city.trim(), state: state.trim() });
  if (!createdPinCode) {
    throw new ApiError(500, 'Failed to create pin code');
  }
  res.status(201).json(new ApiResponse(201, { message: 'PinCode created successfully', pincode: createdPinCode }));
});

exports.getStates = asyncHandler(async (req, res) => {
  const states = await stateModel.find().sort({ state: 1 });
  if (!states || states.length === 0) {
    throw new ApiError(404, 'No states found');
  }
  res.status(200).json(new ApiResponse(200, { message: 'States retrieved successfully', states }));
});

exports.getCities = asyncHandler(async (req, res) => {
  const cities = await cityModel.find().populate('state').sort({ city: 1 });
  if (!cities || cities.length === 0) {
    throw new ApiError(404, 'No cities found');
  }
  res.status(200).json(new ApiResponse(200, { message: 'Cities retrieved successfully', cities }));
});

exports.getPinCodes = asyncHandler(async (req, res) => {
  const pinCodes = await pinCodeModel.find().populate('city').populate('state').sort({ pincode: 1 });
  if (!pinCodes || pinCodes.length === 0) {
    throw new ApiError(404, 'No pin codes found');
  }
  res.status(200).json(new ApiResponse(200, { message: 'Pin Codes retrieved successfully', pinCodes }));
});

