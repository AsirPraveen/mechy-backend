const Workshop = require('../models/Workshop');
const User = require('../models/User');

/**
 * POST /api/workshop
 * Create a workshop (owner only, one per owner)
 */
exports.createWorkshop = async (req, res, next) => {
  try {
    // Check if owner already has a workshop
    const existing = await Workshop.findOne({ ownerId: req.user._id });
    if (existing) {
      return res.status(409).json({ message: 'Workshop already exists', workshop: existing });
    }

    const workshop = new Workshop({
      ownerId: req.user._id,
      ...req.body,
    });

    await workshop.save();

    // Link workshop to owner
    await User.findByIdAndUpdate(req.user._id, { workshopId: workshop._id });

    res.status(201).json({ message: 'Workshop created', workshop });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workshop/:id
 * Get workshop details
 */
exports.getWorkshop = async (req, res, next) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Workshop not found' });
    }
    res.json({ workshop });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/workshop/:id
 * Update workshop details (owner only)
 */
exports.updateWorkshop = async (req, res, next) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Workshop not found' });
    }

    // Ensure only the owner can update
    if (workshop.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the workshop owner can update' });
    }

    const allowed = ['name', 'address', 'phone', 'gstNo', 'logo', 'workingHours', 'labourRatePerHour'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        workshop[field] = req.body[field];
      }
    });

    await workshop.save();
    res.json({ message: 'Workshop updated', workshop });
  } catch (error) {
    next(error);
  }
};
