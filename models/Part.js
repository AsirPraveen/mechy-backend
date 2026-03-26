const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: String,
}, { _id: false });

const partSchema = new mongoose.Schema(
  {
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    sku: String,
    imageUrl: String,
    unit: {
      type: String,
      enum: ['piece', 'litre', 'kg', 'metre', 'set'],
      default: 'piece',
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    priceHistory: [priceHistorySchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Compound index for workshop-scoped queries
partSchema.index({ workshopId: 1, category: 1 });
partSchema.index({ workshopId: 1, name: 'text' });

module.exports = mongoose.model('Part', partSchema);
