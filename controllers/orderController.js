const Order = require('../models/Order');
const Product = require('../models/Product');

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { code, productId, selectedVariants, quantity, shippingAddress } = req.body;
    const orderQty = parseInt(quantity) || 1;

    if (!code || code !== process.env.CHECKOUT_CODE) {
      return res.status(400).json({ error: 'Invalid checkout code' });
    }

    if (!shippingAddress || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.country) {
      return res.status(400).json({ error: 'A valid shipping address is required' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.status === 'deleted') return res.status(400).json({ error: 'Product unavailable' });
    if (product.sellerId === req.user.uid) return res.status(400).json({ error: 'You cannot buy your own product' });

    // Stock check
    if (product.variants?.length > 0 && selectedVariants) {
      for (const [variantName, selectedValue] of Object.entries(selectedVariants)) {
        const variant = product.variants.find(v => v.name === variantName);
        if (!variant) continue;
        const option = variant.options.find(o => o.value === selectedValue);
        if (!option) return res.status(400).json({ error: `Option ${selectedValue} not found` });
        if (option.quantity < orderQty) {
          return res.status(400).json({ error: `Only ${option.quantity} of ${selectedValue} left in stock` });
        }
        option.quantity -= orderQty;
      }
      product.quantity = product.variants.reduce(
        (sum, v) => sum + v.options.reduce((s, o) => s + o.quantity, 0), 0
      );
    } else {
      if (product.quantity < orderQty) {
        return res.status(400).json({ error: `Only ${product.quantity} left in stock` });
      }
      product.quantity -= orderQty;
    }

    if (product.quantity === 0) product.status = 'out_of_stock';
    await product.save();

    const order = await Order.create({
      buyerId: req.user.uid,
      buyerName: req.user.name,
      sellerId: product.sellerId,
      productId: product._id.toString(),
      productTitle: product.title,
      productPrice: product.price * orderQty,
      productImage: product.images?.[0] || null,
      selectedVariants: selectedVariants || {},
      quantity: orderQty,
      shippingAddress,
      status: 'pending',  // starts as pending — seller must confirm
    });

    res.status(201).json({ message: 'Order placed! Waiting for seller to confirm.', orderId: order._id, ...order.toObject() });
  } catch (error) {
    console.error('createOrder error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/orders — buyer or seller orders
const getUserOrders = async (req, res) => {
  try {
    const { role, uid } = req.user;
    const filter = role === 'buyer' ? { buyerId: uid } : { sellerId: uid };
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/orders/:id/confirm — seller confirms order
const confirmOrder = async (req, res) => {
  try {
    const { sellerNote } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.sellerId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    order.status = 'confirmed';
    if (sellerNote) order.sellerNote = sellerNote;
    await order.save();
    res.json({ message: 'Order confirmed', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/orders/:id/reject — seller rejects order
const rejectOrder = async (req, res) => {
  try {
    const { sellerNote } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.sellerId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Restore stock on rejection
    const product = await Product.findById(order.productId);
    if (product) {
      if (product.variants?.length > 0 && order.selectedVariants) {
        for (const [variantName, selectedValue] of Object.entries(order.selectedVariants)) {
          const variant = product.variants.find(v => v.name === variantName);
          if (!variant) continue;
          const option = variant.options.find(o => o.value === selectedValue);
          if (option) option.quantity += order.quantity;
        }
        product.quantity = product.variants.reduce(
          (sum, v) => sum + v.options.reduce((s, o) => s + o.quantity, 0), 0
        );
      } else {
        product.quantity += order.quantity;
      }
      if (product.status === 'out_of_stock' && product.quantity > 0) product.status = 'active';
      await product.save();
    }

    order.status = 'rejected';
    if (sellerNote) order.sellerNote = sellerNote;
    await order.save();
    res.json({ message: 'Order rejected', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createOrder, getUserOrders, confirmOrder, rejectOrder, getAllOrders };