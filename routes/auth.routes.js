const express = require('express');
const { z } = require('zod');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation schemas
const sendOtpSchema = {
  body: z.object({
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
  }),
};

const verifyOtpSchema = {
  body: z.object({
    phone: z.string().min(10),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    name: z.string().min(2).optional(),
    role: z.enum(['owner', 'customer']).optional(),
  }),
};

const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(1),
  }),
};

// Routes
router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/refresh', validate(refreshSchema), authController.refreshToken);
router.get('/me', auth, authController.getMe);
router.patch('/me', auth, authController.updateMe);

module.exports = router;
