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
    passwordHash: { type: String, required: true },
    city: { type: String, default: '' },
    calculationMethod: { type: String, default: 'UmmAlQura' },
    madhab: { type: String, enum: ['shafii', 'hanafi'], default: 'shafii' },
    weights: { type: WeightsSchema, default: () => ({}) },
    notificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    city: this.city,
    calculationMethod: this.calculationMethod,
    madhab: this.madhab,
    weights: this.weights,
    notificationsEnabled: this.notificationsEnabled,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
