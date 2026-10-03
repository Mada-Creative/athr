const mongoose = require('mongoose');

// A local mirror of OpenStreetMap's own mosque data (amenity=place_of_worship
// + religion=muslim), refreshed periodically by src/scripts/importOsmMosques.js
// — kept as its own collection, separate from Mosque (our community-submitted,
// admin-moderated pins), since these two have nothing in common: this one is
// bulk-imported and never moderated, Mosque is one-at-a-time and always is.
//
// The whole point of this collection existing is speed and reliability: the
// map used to query Overpass's shared public API directly, on every pan/zoom,
// from every user's phone — this collection lets it query our own indexed
// MongoDB instead, which is faster and never rate-limited or down.
const OsmMosqueSchema = new mongoose.Schema(
  {
    // OSM's own node id — the natural upsert key so re-running the import
    // updates existing mosques in place instead of duplicating them.
    osmId: { type: Number, required: true, unique: true },
    name: { type: String, trim: true, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
  },
  { timestamps: true }
);

OsmMosqueSchema.index({ location: '2dsphere' });

OsmMosqueSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: `osm-${this.osmId}`,
    name: this.name || 'مسجد',
    latitude: this.location.coordinates[1],
    longitude: this.location.coordinates[0],
    source: 'osm',
  };
};

module.exports = mongoose.model('OsmMosque', OsmMosqueSchema);
