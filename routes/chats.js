// routes/chats.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');
const Chat = require('../models/Chat');

// GET /api/chats
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { uid, role } = req.user;
    const filter = role === 'buyer' ? { buyerId: uid } : { sellerId: uid };
    const chats = await Chat.find(filter).sort({ lastMessage: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats/upload — upload a file/image/video for chat
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const url = req.file.path;
    const originalName = req.file.originalname || 'file';
    const mimetype = req.file.mimetype || '';

    let type = 'file';
    if (mimetype.startsWith('image/')) type = 'image';
    else if (mimetype.startsWith('video/')) type = 'video';

    res.json({ url, type, name: originalName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;