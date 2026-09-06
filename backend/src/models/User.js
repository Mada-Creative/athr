const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PrayerNotificationsSchema = new mongoose.Schema(
  {
    atAdhan: { type: Boolean, default: false },
    // Minutes before each prayer to send a reminder; null means off.
    // Graduated presets only — enforced in the controller, not here.
    reminderMinutes: { type: Number, default: null },
  },
  { _id: false }
);

const WeightsSchema = new mongoose.Schema(
  {
    prayers: { type: Number, default: 50 },
    athkar: { type: Number, default: 10 },
    quran: { type: Number, default: 10 },
    nawafil: { type: Number, default: 10 },
    dailyDeeds: { type: Number, default: 10 },
    other: { type: Number, default: 10 },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Local accounts always have a password; social accounts (Google/Apple)
    // never set one — they authenticate by verified provider token instead.
    passwordHash: {
      type: String,
      required: function requiresPassword() {
        return this.authProvider === 'local';
      },
    },
    authProvider: { type: String, enum: ['local', 'google', 'apple'], default: 'local' },
    // Left unset (not null) for local accounts so the sparse unique index
    // below doesn't collide across users who never signed in with that provider.
    googleId: { type: String, unique: true, sparse: true },
    appleId: { type: String, unique: true, sparse: true },
    city: { type: String, default: '' },
    // Optional, self-reported, and only ever used to decide whether the
    // "legitimate excuse" (عذر شرعي) toggle appears on the tracker.
    gender: { type: String, enum: ['male', 'female', null], default: null },
    calculationMethod: { type: String, default: 'UmmAlQura' },
    madhab: { type: String, enum: ['shafii', 'hanafi'], default: 'shafii' },
    weights: { type: WeightsSchema, default: () => ({}) },
    prayerNotifications: { type: PrayerNotificationsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    authProvider: this.authProvider,
    city: this.city,
    gender: this.gender,
    calculationMethod: this.calculationMethod,
    madhab: this.madhab,
    weights: this.weights,
    prayerNotifications: this.prayerNotifications,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
