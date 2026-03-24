// middleware/adminMiddleware.js
const { auth } = require('../config/firebase');
const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await User.findOne({ uid: decodedToken.uid });
    req.user = user ? user.toObject() : {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: 'Admin',
      role: 'admin',
    };

    next();
  } catch (error) {
    console.error('Admin middleware error:', error.message);
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

module.exports = { adminMiddleware };
