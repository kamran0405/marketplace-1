// middleware/authMiddleware.js
const { auth } = require('../config/firebase');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const user = await User.findOne({ uid: decodedToken.uid });

    if (user) {
      req.user = user.toObject();
    } else {
      // Fallback for first login before user doc is created
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email,
        role: decodedToken.email === process.env.ADMIN_EMAIL ? 'admin' : 'buyer',
      };
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const sellerMiddleware = (req, res, next) => {
  if (req.user?.role !== 'seller' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Seller access required' });
  }
  next();
};

module.exports = { authMiddleware, sellerMiddleware };
