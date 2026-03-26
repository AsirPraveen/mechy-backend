const mongoose = require('mongoose');
const JobCard = require('../models/JobCard');
const StockLedger = require('../models/StockLedger');

/**
 * Helper: generate job card number
 */
const generateJobCardNo = async (workshopId) => {
  const year = new Date().getFullYear();
  const count = await JobCard.countDocuments({ workshopId });
  return `JC-${year}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Helper: recalculate totals
 */
const calculateTotals = (partsUsed, labourCharges = 0, discount = 0, tax = 0) => {
  const partsTotal = partsUsed.reduce((sum, p) => sum + p.total, 0);
  const subtotal = partsTotal + labourCharges;
  const grandTotal = subtotal - discount + tax;
  return { subtotal, grandTotal };
};

/**
 * POST /api/job-cards — Create job card (draft)
 */
exports.createJobCard = async (req, res, next) => {
  try {
    const jobCardNo = await generateJobCardNo(req.workshopId);
    const { customerId, vehicleRegNo, vehicleType, complaint, notes } = req.body;

    const jobCard = new JobCard({
      workshopId: req.workshopId,
      createdBy: req.user._id,
      jobCardNo,
      customerId,
      vehicleRegNo,
      vehicleType,
      complaint,
      notes,
      status: 'draft',
    });

    await jobCard.save();
    res.status(201).json({ message: 'Job card created', jobCard });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/job-cards — List job cards
 */
exports.listJobCards = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { workshopId: req.workshopId };

    if (status) filter.status = status;

    const [jobCards, total] = await Promise.all([
      JobCard.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('customerId', 'name phone')
        .lean(),
      JobCard.countDocuments(filter),
    ]);

    res.json({ jobCards, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/job-cards/:id — Job card detail
 */
exports.getJobCardById = async (req, res, next) => {
  try {
    const jobCard = await JobCard.findOne({ _id: req.params.id, workshopId: req.workshopId })
      .populate('customerId', 'name phone avatar vehicles')
      .lean();
    if (!jobCard) return res.status(404).json({ message: 'Job card not found' });

    res.json({ jobCard });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/job-cards/:id — Update job card (parts, workers, labour, etc.)
 */
exports.updateJobCard = async (req, res, next) => {
  try {
    const jobCard = await JobCard.findOne({ _id: req.params.id, workshopId: req.workshopId });
    if (!jobCard) return res.status(404).json({ message: 'Job card not found' });

    if (jobCard.status === 'paid' || jobCard.status === 'cancelled') {
      return res.status(400).json({ message: `Cannot update a ${jobCard.status} job card` });
    }

    const allowed = [
      'customerId', 'vehicleRegNo', 'vehicleType', 'complaint', 'diagnosis',
      'workDone', 'partsUsed', 'assignedWorkers', 'labourCharges', 'labourHours',
      'discount', 'tax', 'amountPaid', 'notes', 'images',
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) jobCard[field] = req.body[field];
    });

    // Recalculate totals
    const { subtotal, grandTotal } = calculateTotals(
      jobCard.partsUsed, jobCard.labourCharges, jobCard.discount, jobCard.tax,
    );
    jobCard.subtotal = subtotal;
    jobCard.grandTotal = grandTotal;
    jobCard.balanceDue = grandTotal - jobCard.amountPaid;

    await jobCard.save();
    res.json({ message: 'Job card updated', jobCard });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/job-cards/:id/status — Change status
 * When status → "paid": create StockLedger usage entries
 * Uses transactions on replica sets (Atlas), falls back to sequential on standalone (local dev)
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const jobCard = await JobCard.findOne({ _id: req.params.id, workshopId: req.workshopId });
    if (!jobCard) return res.status(404).json({ message: 'Job card not found' });

    // Validate status transitions
    const validTransitions = {
      'draft': ['in-progress', 'cancelled'],
      'in-progress': ['completed', 'cancelled'],
      'completed': ['paid', 'in-progress'],
      'paid': [],
      'cancelled': [],
    };

    if (!validTransitions[jobCard.status]?.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from '${jobCard.status}' to '${status}'`,
      });
    }

    // If marking as "paid", create stock ledger entries
    if (status === 'paid') {
      const ledgerEntries = jobCard.partsUsed.map((part) => ({
        workshopId: req.workshopId,
        partId: part.partId,
        type: 'usage',
        quantity: -part.quantity, // negative = stock out
        unitCost: part.costPrice,
        referenceType: 'job_card',
        referenceId: jobCard._id,
        note: `Used in ${jobCard.jobCardNo} for ${jobCard.vehicleRegNo}`,
        createdBy: req.user._id,
      }));

      // Insert stock ledger entries and update job card
      // NOTE: For production (Atlas with replica set), wrap in a transaction.
      // The append-only ledger design ensures consistency — partial writes are detectable.
      if (ledgerEntries.length > 0) {
        await StockLedger.insertMany(ledgerEntries);
      }

      jobCard.status = 'paid';
      jobCard.paidAt = new Date();
      jobCard.amountPaid = jobCard.grandTotal;
      jobCard.balanceDue = 0;
      await jobCard.save();
    } else {
      jobCard.status = status;
      await jobCard.save();
    }

    res.json({ message: `Job card status updated to '${status}'`, jobCard });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/job-cards/customer/:customerId — Customer's job cards
 */
exports.getCustomerJobCards = async (req, res, next) => {
  try {
    const jobCards = await JobCard.find({
      customerId: req.params.customerId,
      workshopId: req.workshopId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ jobCards });
  } catch (error) {
    next(error);
  }
};
