const mongoose = require('mongoose');

const partUsedSchema = new mongoose.Schema({
  partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
  partName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const assignedWorkerSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  workerName: { type: String, required: true },
  task: String,
}, { _id: false });

const jobCardSchema = new mongoose.Schema(
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
    jobCardNo: {
      type: String,
      required: true,
      unique: true,
    },
    // Vehicle & Customer
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    vehicleRegNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: ['3-wheeler', '2-wheeler', 'car', 'other'],
      default: 'other',
    },
    // Work Details
    complaint: String,
    diagnosis: String,
    workDone: String,
    // Parts Used
    partsUsed: [partUsedSchema],
    // Worker Assignment
    assignedWorkers: [assignedWorkerSchema],
    // Labour
    labourCharges: { type: Number, default: 0 },
    labourHours: { type: Number, default: 0 },
    // Financials
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    // Status
    status: {
      type: String,
      enum: ['draft', 'in-progress', 'completed', 'paid', 'cancelled'],
      default: 'draft',
    },
    paidAt: Date,
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    notes: String,
    images: [String],
  },
  { timestamps: true },
);

// Indexes
jobCardSchema.index({ workshopId: 1, status: 1 });
jobCardSchema.index({ workshopId: 1, customerId: 1 });
jobCardSchema.index({ workshopId: 1, vehicleRegNo: 1 });

module.exports = mongoose.model('JobCard', jobCardSchema);
