const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    calculationMethod: { type: String, default: 'UmmAlQura' },
    madhab: { type: String, enum: ['shafii', 'hanafi'], default: 'shafii' },
    weights: { type: WeightsSchema, default: () => ({}) },
    notificationsEnabled: { type: Boolean, default: true },
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
    calculationMethod: this.calculationMethod,
    madhab: this.madhab,
    weights: this.weights,
    notificationsEnabled: this.notificationsEnabled,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
