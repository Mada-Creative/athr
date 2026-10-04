const mongoose = require('mongoose');

// A single report against an already-approved mosque (wrong location,
// doesn't exist, wrong name, etc.) — kept as a subdocument rather than a
// separate collection since there's never more than a handful per mosque
// and the admin review page reads them alongside the mosque itself.
const ReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true, default: '' },
  },
  { timestamps: true, _id: false }
);

// User-submitted mosque pins for the mosque map. New submissions start
// 'pending' and only appear on the public map once approved through the
// admin review page (see adminMosqueController.js) — there's no automated
// moderation here, just a human (currently the app's own developer)
// checking each one within ~48 hours, per how the feature was scoped.
const MosqueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Filled in from reverse-geocoding the submitted coordinates on the
    // client (see usePrayerTimes.js's own city/subregion fallback for the
    // same pattern) — shown alongside the name so two mosques that share a
    // common name ("مسجد النور") are still distinguishable.
    city: { type: String, trim: true, default: '' },
    // GeoJSON, required for the 2dsphere index below ($near/$geoWithin
    // queries — nearby-duplicate check on submit, "أقرب مسجد مني").
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reports: { type: [ReportSchema], default: [] },
  },
  { timestamps: true }
);

MosqueSchema.index({ location: '2dsphere' });

MosqueSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    city: this.city,
    latitude: this.location.coordinates[1],
    longitude: this.location.coordinates[0],
  };
};

module.exports = mongoose.model('Mosque', MosqueSchema);
