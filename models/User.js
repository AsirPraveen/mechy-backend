const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  registrationNo: { type: String, required: true },
  type: { type: String, enum: ['3-wheeler', '2-wheeler', 'car', 'other'], default: 'other' },
  make: String,
  model: String,
  year: Number,
  imageUrl: String,
});

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['owner', 'customer'],
      required: true,
    },
    avatar: String,
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
    },
    vehicles: [vehicleSchema],
    fcmToken: String,
  },
  { timestamps: true },
);

// Index for workshop-scoped customer queries
userSchema.index({ workshopId: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
