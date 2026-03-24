// routes/auth.js
const express = require('express');
const router = express.Router();
const { signup, adminLogin, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const { upload } = require('../config/cloudinary');
const User = require('../models/User');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller'),
  ],
  validate,
  signup
);

// POST /api/auth/admin-login
router.post('/admin-login', adminLogin);

// GET /api/auth/me
router.get('/me', authMiddleware, getMe);

// PUT /api/auth/profile — update name
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { name },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/avatar — upload profile picture
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { avatar: req.file.path },
      { new: true }
    );
    res.json({ avatar: req.file.path, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/address-search?q=... — proxy SerpApi to avoid CORS
router.get('/address-search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) return res.json([]);

    const key = process.env.SERPAPI_KEY;
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(q)}&api_key=${key}&type=search`
    );
    const data = await response.json();

    const places = data.local_results || [];
    const formatted = places.slice(0, 5).map(p => ({
      title: p.title || '',
      address: p.address || p.description || '',
      placeId: p.place_id || '',
      lat: p.gps_coordinates?.latitude,
      lng: p.gps_coordinates?.longitude,
    })).filter(p => p.address);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/addresses — get all saved addresses
router.get('/addresses', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.addresses || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/addresses — save a new address
router.post('/addresses', authMiddleware, async (req, res) => {
  try {
    const {
      label, fullAddress, fullName, phone,
      line1, line2, city, state, postalCode,
      country, isDefault, placeId, lat, lng,
    } = req.body;

    // Support both formats — simple fullAddress OR structured fields
    const resolvedAddress = fullAddress?.trim() ||
      [line1, line2, city, state, postalCode, country].filter(Boolean).join(', ');

    if (!resolvedAddress) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const addressDoc = {
      label: label || 'Home',
      fullAddress: resolvedAddress,
      fullName: fullName || '',
      phone: phone || '',
      line1: line1 || '',
      line2: line2 || '',
      city: city || '',
      state: state || '',
      postalCode: postalCode || '',
      country: country || '',
      isDefault: isDefault || false,
      placeId: placeId || '',
      lat: lat || null,
      lng: lng || null,
    };

    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $push: { addresses: addressDoc } },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.addresses);
  } catch (err) {
    console.error('Save address error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/addresses/:addressId — remove a saved address
router.delete('/addresses/:addressId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $pull: { addresses: { _id: req.params.addressId } } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;