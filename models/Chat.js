// models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String },
  text: { type: String, default: '' },
  // File/media attachment
  attachment: {
    url: { type: String },
    type: { type: String, enum: ['image', 'video', 'file'] },
    name: { type: String },
  },
  seenBy: [{ type: String }],      // array of userIds who have seen this message
  deliveredTo: [{ type: String }], // array of userIds it was delivered to
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  buyerId: { type: String, required: true },
  buyerName: { type: String },
  sellerId: { type: String, required: true },
  sellerName: { type: String },
  productId: { type: String },
  messages: [messageSchema],
  lastMessage: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);