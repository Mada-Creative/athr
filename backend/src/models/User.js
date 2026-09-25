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
    authProvider: { type: String, enum: ['local', 'google', 'apple', 'device'], default: 'local' },
    // Left unset (not null) for local accounts so the sparse unique index
    // below doesn't collide across users who never signed in with that provider.
    googleId: { type: String, unique: true, sparse: true },
    appleId: { type: String, unique: true, sparse: true },
    // A guest account: created silently on first launch from a UUID the app
    // generates and keeps on-device, so nobody has to sign in just to start
    // tracking. Real credentials (email/password, Google, Apple) can be
    // added later without losing this account's history — see
    // authController.upgradeAccount.
    deviceId: { type: String, unique: true, sparse: true },
    city: { type: String, default: '' },
    // Optional, self-reported, and only ever used to decide whether the
    // "legitimate excuse" (عذر شرعي) toggle appears on the tracker.
    gender: { type: String, enum: ['male', 'female', null], default: null },
    calculationMethod: { type: String, default: 'UmmAlQura' },
    madhab: { type: String, enum: ['shafii', 'hanafi'], default: 'shafii' },
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
    prayerNotifications: this.prayerNotifications,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
