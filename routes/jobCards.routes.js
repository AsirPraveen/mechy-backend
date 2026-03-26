const express = require('express');
const router = express.Router();

const jobCardsController = require('../controllers/jobCards.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

router.use(auth, tenantScope);

router.post('/', roleGuard('owner'), jobCardsController.createJobCard);
router.get('/', jobCardsController.listJobCards);
router.get('/:id', jobCardsController.getJobCardById);
router.patch('/:id', roleGuard('owner'), jobCardsController.updateJobCard);
router.patch('/:id/status', roleGuard('owner'), jobCardsController.updateStatus);
router.get('/customer/:customerId', jobCardsController.getCustomerJobCards);

module.exports = router;
