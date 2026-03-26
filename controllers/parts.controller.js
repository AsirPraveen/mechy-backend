const Part = require('../models/Part');
const StockLedger = require('../models/StockLedger');
const mongoose = require('mongoose');

/**
 * Helper: compute current stock for a part via ledger aggregation
 */
const computeStock = async (partId, workshopId) => {
  const result = await StockLedger.aggregate([
    { $match: { partId: new mongoose.Types.ObjectId(partId), workshopId: new mongoose.Types.ObjectId(workshopId) } },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

/**
 * Helper: compute stock for multiple parts at once
 */
const computeStockBulk = async (workshopId) => {
  return StockLedger.aggregate([
    { $match: { workshopId: new mongoose.Types.ObjectId(workshopId) } },
    { $group: { _id: '$partId', currentStock: { $sum: '$quantity' } } },
  ]);
};

/**
 * POST /api/parts — Create a new part
 */
exports.createPart = async (req, res, next) => {
  try {
    const { name, category, sku, imageUrl, unit, costPrice, sellingPrice, lowStockThreshold, initialStock } = req.body;

    const part = new Part({
      workshopId: req.workshopId,
      createdBy: req.user._id,
      name,
      category,
      sku,
      imageUrl,
      unit,
      costPrice,
      sellingPrice,
      lowStockThreshold,
      priceHistory: [{
        costPrice,
        sellingPrice,
        changedAt: new Date(),
        changedBy: req.user._id,
        reason: 'Initial price',
      }],
    });

    await part.save();

    // If initial stock provided, create a ledger entry
    if (initialStock && initialStock > 0) {
      await StockLedger.create({
        workshopId: req.workshopId,
        partId: part._id,
        type: 'purchase',
        quantity: initialStock,
        unitCost: costPrice,
        referenceType: 'manual',
        note: 'Initial stock entry',
        createdBy: req.user._id,
      });
    }

    res.status(201).json({
      message: 'Part created',
      part: { ...part.toObject(), currentStock: initialStock || 0 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parts — List all parts with computed stock
 */
exports.listParts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const filter = { workshopId: req.workshopId, isActive: true };

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const [parts, total, stockData] = await Promise.all([
      Part.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Part.countDocuments(filter),
      computeStockBulk(req.workshopId),
    ]);

    // Map stock data to parts
    const stockMap = {};
    stockData.forEach((s) => { stockMap[s._id.toString()] = s.currentStock; });

    const partsWithStock = parts.map((p) => ({
      ...p,
      currentStock: stockMap[p._id.toString()] || 0,
    }));

    res.json({
      parts: partsWithStock,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parts/:id — Part detail with stock + price history
 */
exports.getPartById = async (req, res, next) => {
  try {
    const part = await Part.findOne({ _id: req.params.id, workshopId: req.workshopId }).lean();
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const currentStock = await computeStock(part._id, req.workshopId);

    res.json({ part: { ...part, currentStock } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/parts/:id — Update part (auto-logs price changes)
 */
exports.updatePart = async (req, res, next) => {
  try {
    const part = await Part.findOne({ _id: req.params.id, workshopId: req.workshopId });
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const { name, category, sku, imageUrl, unit, costPrice, sellingPrice, lowStockThreshold } = req.body;

    // Track price changes
    const priceChanged = (costPrice !== undefined && costPrice !== part.costPrice) ||
      (sellingPrice !== undefined && sellingPrice !== part.sellingPrice);

    if (priceChanged) {
      part.priceHistory.push({
        costPrice: costPrice ?? part.costPrice,
        sellingPrice: sellingPrice ?? part.sellingPrice,
        changedAt: new Date(),
        changedBy: req.user._id,
        reason: req.body.priceChangeReason || 'Price update',
      });
    }

    // Apply updates
    if (name !== undefined) part.name = name;
    if (category !== undefined) part.category = category;
    if (sku !== undefined) part.sku = sku;
    if (imageUrl !== undefined) part.imageUrl = imageUrl;
    if (unit !== undefined) part.unit = unit;
    if (costPrice !== undefined) part.costPrice = costPrice;
    if (sellingPrice !== undefined) part.sellingPrice = sellingPrice;
    if (lowStockThreshold !== undefined) part.lowStockThreshold = lowStockThreshold;

    await part.save();

    const currentStock = await computeStock(part._id, req.workshopId);
    res.json({ message: 'Part updated', part: { ...part.toObject(), currentStock } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/parts/:id/stock — Direct stock increment/decrement
 */
exports.adjustStock = async (req, res, next) => {
  try {
    const { quantity, note } = req.body; // positive = add, negative = remove

    const part = await Part.findOne({ _id: req.params.id, workshopId: req.workshopId });
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const type = quantity > 0 ? 'purchase' : 'adjustment';

    await StockLedger.create({
      workshopId: req.workshopId,
      partId: part._id,
      type,
      quantity,
      unitCost: part.costPrice,
      referenceType: 'manual',
      note: note || (quantity > 0 ? 'Manual stock addition' : 'Manual stock removal'),
      createdBy: req.user._id,
    });

    const currentStock = await computeStock(part._id, req.workshopId);

    res.json({ message: 'Stock adjusted', partId: part._id, currentStock });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/parts/:id — Soft delete
 */
exports.deletePart = async (req, res, next) => {
  try {
    const part = await Part.findOneAndUpdate(
      { _id: req.params.id, workshopId: req.workshopId },
      { isActive: false },
      { new: true },
    );
    if (!part) return res.status(404).json({ message: 'Part not found' });

    res.json({ message: 'Part deactivated' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parts/low-stock — Parts below threshold
 */
exports.getLowStock = async (req, res, next) => {
  try {
    const parts = await Part.find({ workshopId: req.workshopId, isActive: true }).lean();
    const stockData = await computeStockBulk(req.workshopId);

    const stockMap = {};
    stockData.forEach((s) => { stockMap[s._id.toString()] = s.currentStock; });

    const lowStockParts = parts
      .map((p) => ({ ...p, currentStock: stockMap[p._id.toString()] || 0 }))
      .filter((p) => p.currentStock <= p.lowStockThreshold);

    res.json({ parts: lowStockParts, count: lowStockParts.length });
  } catch (error) {
    next(error);
  }
};
