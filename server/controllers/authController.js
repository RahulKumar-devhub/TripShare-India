const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{10}$/;

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { fullName, email, phone, city, password, confirmPassword } = req.body;

    if (!fullName || !email || !phone || !city || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      city,
      password: hashed
    });

    const token = signToken(user);
    res.status(201).json({ success: true, message: 'Account created successfully.', token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Signup failed.', error: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({ success: true, message: 'Logged in successfully.', token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed.', error: err.message });
  }
};

// GET /api/auth/me  (protected) - used on page refresh to restore session
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

// POST /api/auth/forgot-password
// Demo-safe flow: generates a reset token and returns it directly in the
// response instead of emailing it, since no email service is configured.
// In production, replace the "resetToken in response" line with an email send
// (e.g. Nodemailer + a transactional email provider) and only return a
// generic success message to the client.
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    res.json({
      success: true,
      message: 'Reset token generated. (Demo mode: shown here instead of emailed.)',
      resetToken
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not process request.', error: err.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findOne({
      email: (email || '').toLowerCase(),
      resetToken,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset token is invalid or has expired.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not reset password.', error: err.message });
  }
};

module.exports = { signup, login, getMe, forgotPassword, resetPassword };
