const StockLedger = require('../models/StockLedger');

/**
 * GET /api/stock-ledger/:partId — Movement history for a part
 */
exports.getPartLedger = async (req, res, next) => {
  try {
    const entries = await StockLedger.find({
      partId: req.params.partId,
      workshopId: req.workshopId,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('createdBy', 'name')
      .lean();

    res.json({ entries });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stock-ledger — Manual stock adjustment entry
 */
exports.createEntry = async (req, res, next) => {
  try {
    const { partId, type, quantity, unitCost, note, supplier, invoiceNo } = req.body;

    const entry = await StockLedger.create({
      workshopId: req.workshopId,
      partId,
      type,
      quantity,
      unitCost,
      referenceType: 'manual',
      note,
      supplier,
      invoiceNo,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Ledger entry created', entry });
  } catch (error) {
    next(error);
  }
};
