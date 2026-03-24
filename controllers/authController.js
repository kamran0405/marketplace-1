// controllers/authController.js
const { auth } = require('../config/firebase');
const User = require('../models/User');

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({ error: 'Role must be buyer or seller' });
    }

    const userRecord = await auth.createUser({ email, password, displayName: name });

    const user = await User.create({ uid: userRecord.uid, email, name, role });

    res.status(201).json({ message: 'User created successfully', uid: userRecord.uid, role });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

// POST /api/auth/admin-login
const adminLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    const decodedToken = await auth.verifyIdToken(idToken);

    console.log('Login attempt:', decodedToken.email, '| Expected:', process.env.ADMIN_EMAIL);

    if (decodedToken.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    await User.findOneAndUpdate(
      { uid: decodedToken.uid },
      {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || 'Admin',
        role: 'admin',
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Admin authenticated', uid: decodedToken.uid });
  } catch (error) {
    console.error('Admin login error:', error.message);
    res.status(500).json({ error: 'Admin authentication failed: ' + error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { signup, adminLogin, getMe };
