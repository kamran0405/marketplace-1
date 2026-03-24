// routes/admin.js
const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { getAllOrders } = require('../controllers/orderController');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Offer = require('../models/Offer');

router.use(adminMiddleware);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/orders', getAllOrders);

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/offers', async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/analytics', async (req, res) => {
  try {
    const [totalUsers, products, orders, offers] = await Promise.all([
      User.countDocuments(),
      Product.find(),
      Order.find(),
      Offer.countDocuments(),
    ]);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.productPrice || 0), 0);
    res.json({
      totalUsers,
      totalProducts: products.filter(p => p.status === 'active').length,
      totalOrders: orders.length,
      totalRevenue,
      totalOffers: offers,
      soldProducts: products.filter(p => p.status === 'sold').length,
      deletedProducts: products.filter(p => p.status === 'deleted').length,
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { auth } = require('../config/firebase');
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await auth.deleteUser(user.uid);
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;