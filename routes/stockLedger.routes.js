const express = require('express');
const router = express.Router();

const stockLedgerController = require('../controllers/stockLedger.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

router.use(auth, tenantScope);

router.get('/:partId', roleGuard('owner'), stockLedgerController.getPartLedger);
router.post('/', roleGuard('owner'), stockLedgerController.createEntry);

module.exports = router;
