// models/Offer.js
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productTitle: { type: String },
  productImage: { type: String },
  originalPrice: { type: Number, required: true },
  buyerId: { type: String, required: true },
  buyerName: { type: String },
  sellerId: { type: String, required: true },
  sellerName: { type: String },
  offerPrice: { type: Number, required: true },
  counterPrice: { type: Number, default: null },
  message: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'countered'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);