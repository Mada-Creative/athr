const mongoose = require('mongoose');

// A free-form dhikr counter — unlike AthkarLog (fixed categories, resets
// daily), this is a personal running tally the user names themselves and
// keeps until they choose to reset it.
const TasbihCounterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TasbihCounter', TasbihCounterSchema);
