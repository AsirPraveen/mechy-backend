const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workshop = require('../models/Workshop');

// In-memory OTP store (for development; use Redis in production)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number
 */
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    // Generate OTP (in dev, we can use bypass)
    const otp = process.env.OTP_BYPASS || generateOTP();

    // Store OTP with expiry (5 minutes)
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // In production, send via SMS gateway here
    console.log(`📲 OTP for ${phone}: ${otp}`);

    res.json({
      message: 'OTP sent successfully',
      // Only in development — remove in production
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify OTP and return JWT tokens
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, name, role } = req.body;

    // Verify OTP
    const storedOtp = otpStore.get(phone);
    const bypassOtp = process.env.OTP_BYPASS;

    if (bypassOtp && otp === bypassOtp) {
      // Dev bypass
    } else if (!storedOtp || storedOtp.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    } else if (storedOtp.expiresAt < Date.now()) {
      otpStore.delete(phone);
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Clear OTP
    otpStore.delete(phone);

    // Find or create user
    let user = await User.findOne({ phone });
    let workshop = null;
    let isNewUser = false;

    if (!user) {
      // New user registration
      if (!name || !role) {
        return res.status(400).json({
          message: 'Name and role are required for new registration',
          code: 'REGISTRATION_REQUIRED',
        });
      }

      user = new User({ phone, name, role });

      // If owner, auto-create a workshop
      if (role === 'owner') {
        workshop = new Workshop({
          ownerId: user._id,
          name: `${name}'s Workshop`,
          phone,
        });
        await workshop.save();
        user.workshopId = workshop._id;
      }

      await user.save();
      isNewUser = true;
    } else {
      // Existing user — get their workshop
      if (user.workshopId) {
        workshop = await Workshop.findById(user.workshopId);
      }
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, workshopId: user.workshopId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' },
    );

    res.json({
      message: isNewUser ? 'Registration successful' : 'Login successful',
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        workshopId: user.workshopId,
        vehicles: user.vehicles,
      },
      workshop: workshop
        ? {
            _id: workshop._id,
            name: workshop.name,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, workshopId: user.workshopId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    );

    res.json({ accessToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired. Please login again.' });
    }
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current user profile
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let workshop = null;

    if (user.workshopId) {
      workshop = await Workshop.findById(user.workshopId);
    }

    res.json({
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        workshopId: user.workshopId,
        vehicles: user.vehicles,
      },
      workshop,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/auth/me
 * Update current user profile
 */
exports.updateMe = async (req, res, next) => {
  try {
    const { name, avatar, fcmToken } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (avatar) updates.avatar = avatar;
    if (fcmToken) updates.fcmToken = fcmToken;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-__v');

    res.json({ user });
  } catch (error) {
    next(error);
  }
};
