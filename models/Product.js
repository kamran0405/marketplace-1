// models/Product.js
const mongoose = require('mongoose');

const variantOptionSchema = new mongoose.Schema({
  value: { type: String, required: true },  // e.g. "Red", "XL"
  quantity: { type: Number, default: 0, min: 0 },
});

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },   // e.g. "Color", "Size"
  options: [variantOptionSchema],
});

const productSchema = new mongoose.Schema({
  sellerId: { type: String, required: true },
  sellerName: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  images: [{ type: String }],
  quantity: { type: Number, required: true, default: 1, min: 0 }, // total if no variants
  variants: [variantSchema],
  status: { type: String, enum: ['active', 'sold', 'deleted', 'out_of_stock'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);