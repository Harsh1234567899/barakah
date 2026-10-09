const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
    unique: true
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: true
  }
});

const City = mongoose.model('City', citySchema);
module.exports = City;