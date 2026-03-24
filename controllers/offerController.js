const Offer = require('../models/Offer');
const Product = require('../models/Product');

// POST /api/offers — buyer sends offer
const createOffer = async (req, res) => {
  try {
    const { productId, offerPrice, message, quantity, selectedVariants } = req.body;

    if (!offerPrice || offerPrice <= 0) {
      return res.status(400).json({ error: 'Offer price must be greater than 0' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.sellerId === req.user.uid) {
      return res.status(400).json({ error: 'You cannot make an offer on your own product' });
    }

    // Check for existing pending offer from same buyer
    const existing = await Offer.findOne({
      productId,
      buyerId: req.user.uid,
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({ error: 'You already have a pending offer on this product' });
    }

    // Expire after 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const offer = await Offer.create({
      productId,
      productTitle: product.title,
      productImage: product.images?.[0] || null,
      originalPrice: product.price,
      buyerId: req.user.uid,
      buyerName: req.user.name,
      sellerId: product.sellerId,
      offerPrice: parseFloat(offerPrice),
      message,
      quantity: parseInt(quantity) || 1,
      selectedVariants: selectedVariants || {},
      expiresAt,
    });

    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/offers — get offers for current user
const getOffers = async (req, res) => {
  try {
    const { uid, role } = req.user;
    const filter = role === 'buyer' ? { buyerId: uid } : { sellerId: uid };
    const offers = await Offer.find(filter).sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/offers/:id/accept — seller accepts
const acceptOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.sellerId !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });
    if (offer.status !== 'pending' && offer.status !== 'countered') {
      return res.status(400).json({ error: 'Offer is no longer active' });
    }
    offer.status = 'accepted';
    await offer.save();
    res.json({ message: 'Offer accepted! Buyer can now place the order.', offer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/offers/:id/reject — seller rejects
const rejectOffer = async (req, res) => {
  try {
    const { message } = req.body;
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.sellerId !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });
    offer.status = 'rejected';
    if (message) offer.counterMessage = message;
    await offer.save();
    res.json({ message: 'Offer rejected', offer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/offers/:id/counter — seller counters with different price
const counterOffer = async (req, res) => {
  try {
    const { counterPrice, counterMessage } = req.body;
    if (!counterPrice || counterPrice <= 0) {
      return res.status(400).json({ error: 'Counter price must be greater than 0' });
    }
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.sellerId !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });
    offer.status = 'countered';
    offer.counterPrice = parseFloat(counterPrice);
    if (counterMessage) offer.counterMessage = counterMessage;
    await offer.save();
    res.json({ message: 'Counter offer sent', offer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/offers/:id/accept-counter — buyer accepts counter offer
const acceptCounter = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.buyerId !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });
    if (offer.status !== 'countered') return res.status(400).json({ error: 'No counter offer to accept' });
    offer.status = 'accepted';
    offer.offerPrice = offer.counterPrice; // finalize at counter price
    await offer.save();
    res.json({ message: 'Counter offer accepted!', offer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createOffer, getOffers, acceptOffer, rejectOffer, counterOffer, acceptCounter };