// models/User.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  fullAddress: { type: String, required: true },
  fullName: { type: String, default: '' },
  phone: { type: String, default: '' },
  line1: { type: String, default: '' },
  line2: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  country: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
  placeId: { type: String, default: '' },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
});

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  avatar: { type: String, default: null },
  addresses: [addressSchema],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);