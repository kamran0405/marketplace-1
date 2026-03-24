const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders, confirmOrder, rejectOrder } = require('../controllers/orderController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createOrder);
router.get('/', authMiddleware, getUserOrders);
router.put('/:id/confirm', authMiddleware, confirmOrder);
router.put('/:id/reject', authMiddleware, rejectOrder);

module.exports = router;