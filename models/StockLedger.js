const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema(
  {
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      required: true,
    },
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'usage', 'adjustment', 'return'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true, // positive = stock in, negative = stock out
    },
    unitCost: {
      type: Number,
      default: 0,
    },
    referenceType: {
      type: String,
      enum: ['manual', 'job_card', 'purchase_order'],
      default: 'manual',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    note: String,
    supplier: String,
    invoiceNo: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // immutable entries
  },
);

// Index for computing current stock efficiently
stockLedgerSchema.index({ workshopId: 1, partId: 1, createdAt: -1 });

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
