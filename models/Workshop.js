const mongoose = require('mongoose');

const workshopSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      line1: String,
      city: String,
      state: String,
      pincode: String,
    },
    phone: {
      type: String,
      required: true,
    },
    gstNo: String,
    logo: String,
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '18:00' },
      offDays: { type: [Number], default: [0] }, // 0 = Sunday
    },
    labourRatePerHour: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Workshop', workshopSchema);
