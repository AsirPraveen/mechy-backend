const express = require('express');
const router = express.Router();

const workshopController = require('../controllers/workshop.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// All workshop routes require authentication
router.use(auth);

router.post('/', roleGuard('owner'), workshopController.createWorkshop);
router.get('/:id', workshopController.getWorkshop);
router.patch('/:id', roleGuard('owner'), workshopController.updateWorkshop);

module.exports = router;
