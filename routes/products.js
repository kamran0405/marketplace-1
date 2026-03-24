// routes/products.js
const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { authMiddleware, sellerMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { upload } = require('../config/cloudinary');

// GET /api/products — public product listing
router.get('/', getProducts);

// GET /api/products/:id — public product detail
router.get('/:id', getProductById);

// POST /api/products — create product (seller only)
// upload.array('images', 5) processes up to 5 images via multer → Cloudinary
router.post('/', authMiddleware, sellerMiddleware, upload.array('images', 5), createProduct);

// PUT /api/products/:id — update product (seller = own, admin = any)
router.put('/:id', authMiddleware, upload.array('images', 5), updateProduct);

// DELETE /api/products/:id — soft-delete (seller = own, admin = any)
router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;
