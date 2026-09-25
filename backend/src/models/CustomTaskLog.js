const mongoose = require('mongoose');

const CustomTaskLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomTask', required: true },
    date: { type: String, required: true, index: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CustomTaskLogSchema.index({ user: 1, task: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CustomTaskLog', CustomTaskLogSchema);
