const express = require('express');
const router = express.Router();

const partsController = require('../controllers/parts.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

// All routes require auth + tenant scope
router.use(auth, tenantScope);

// Low-stock must be before /:id to avoid route conflict
router.get('/low-stock', roleGuard('owner'), partsController.getLowStock);

router.post('/', roleGuard('owner'), partsController.createPart);
router.get('/', partsController.listParts);
router.get('/:id', partsController.getPartById);
router.patch('/:id', roleGuard('owner'), partsController.updatePart);
router.patch('/:id/stock', roleGuard('owner'), partsController.adjustStock);
router.delete('/:id', roleGuard('owner'), partsController.deletePart);

module.exports = router;
