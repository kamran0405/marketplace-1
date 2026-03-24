const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerId: { type: String, required: true },
  buyerName: { type: String },
  sellerId: { type: String, required: true },
  productId: { type: String, required: true },
  productTitle: { type: String },
  productPrice: { type: Number },
  productImage: { type: String },
  selectedVariants: { type: Object, default: {} },
  quantity: { type: Number, default: 1 },
  shippingAddress: {
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  // pending = waiting for seller, confirmed = seller accepted, rejected = seller rejected
  status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
  sellerNote: { type: String },   // seller can add a note when confirming/rejecting
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);