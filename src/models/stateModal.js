const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
    unique: true
  }
});

const State = mongoose.model('State', stateSchema);
module.exports = State;