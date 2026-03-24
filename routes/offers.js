// routes/offers.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const Offer = require('../models/Offer');
const Product = require('../models/Product');

// POST /api/offers — buyer sends offer
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, offerPrice, message } = req.body;

    if (!offerPrice || offerPrice <= 0) {
      return res.status(400).json({ error: 'Invalid offer price' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.sellerId === req.user.uid) {
      return res.status(400).json({ error: 'You cannot make an offer on your own product' });
    }

    // Check if buyer already has a pending offer on this product
    const existing = await Offer.findOne({
      productId,
      buyerId: req.user.uid,
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({ error: 'You already have a pending offer on this product' });
    }

    const offer = await Offer.create({
      productId,
      productTitle: product.title,
      productImage: product.images?.[0] || null,
      originalPrice: product.price,
      buyerId: req.user.uid,
      buyerName: req.user.name,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      offerPrice: parseFloat(offerPrice),
      message: message || '',
    });

    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/offers — get offers for current user (buyer or seller)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { uid, role } = req.user;
    const filter = role === 'buyer' ? { buyerId: uid } : { sellerId: uid };
    const offers = await Offer.find(filter).sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/offers/all — admin only
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/offers/:id — seller accepts, rejects, or counters
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { action, counterPrice } = req.body;
    const offer = await Offer.findById(req.params.id);

    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.sellerId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (offer.status !== 'pending' && offer.status !== 'countered') {
      return res.status(400).json({ error: 'Offer already resolved' });
    }

    if (action === 'accept') {
      offer.status = 'accepted';
    } else if (action === 'reject') {
      offer.status = 'rejected';
    } else if (action === 'counter') {
      if (!counterPrice || counterPrice <= 0) {
        return res.status(400).json({ error: 'Invalid counter price' });
      }
      offer.counterPrice = parseFloat(counterPrice);
      offer.status = 'countered';
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await offer.save();
    res.json(offer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/offers/:id/buyer-response — buyer accepts or rejects counter
router.put('/:id/buyer-response', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body;
    const offer = await Offer.findById(req.params.id);

    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.buyerId !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });
    if (offer.status !== 'countered') return res.status(400).json({ error: 'No counter offer to respond to' });

    offer.status = action === 'accept' ? 'accepted' : 'rejected';
    await offer.save();
    res.json(offer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/offers/:id — buyer cancels pending offer
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.buyerId !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });
    if (offer.status !== 'pending') return res.status(400).json({ error: 'Can only cancel pending offers' });
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer cancelled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;