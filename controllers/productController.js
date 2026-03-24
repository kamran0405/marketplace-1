// controllers/productController.js
const Product = require('../models/Product');

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const { search, sellerId, status } = req.query;
    const filter = {};

    if (status === 'all') {
      // no filter
    } else {
      filter.status = status || 'active';
    }

    if (sellerId) filter.sellerId = sellerId;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('getProducts error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const { title, description, price, quantity, variants } = req.body;

    if (!title || !description || !price) {
      return res.status(400).json({ error: 'Title, description, and price are required' });
    }

    const images = req.files?.map((f) => f.path) || [];

    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch { parsedVariants = []; }
    }

    const qty = parseInt(quantity) || 1;

    // If variants exist, total quantity = sum of all option quantities
    const totalQty = parsedVariants.length > 0
      ? parsedVariants.reduce((sum, v) => sum + v.options.reduce((s, o) => s + (parseInt(o.quantity) || 0), 0), 0)
      : qty;

    const product = await Product.create({
      sellerId: req.user.uid,
      sellerName: req.user.name,
      title,
      description,
      price: parseFloat(price),
      images,
      quantity: totalQty,
      variants: parsedVariants,
      status: totalQty === 0 ? 'out_of_stock' : 'active',
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('createProduct error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (req.user.role !== 'admin' && product.sellerId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, price, status, quantity, variants } = req.body;
    if (title) product.title = title;
    if (description) product.description = description;
    if (price) product.price = parseFloat(price);
    if (status) product.status = status;
    if (req.files?.length > 0) product.images = req.files.map((f) => f.path);

    if (variants) {
      try {
        const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        product.variants = parsedVariants;
        // Recalculate total quantity from variants
        const totalQty = parsedVariants.reduce(
          (sum, v) => sum + v.options.reduce((s, o) => s + (parseInt(o.quantity) || 0), 0), 0
        );
        product.quantity = totalQty;
        if (totalQty === 0 && product.status === 'active') product.status = 'out_of_stock';
        if (totalQty > 0 && product.status === 'out_of_stock') product.status = 'active';
      } catch {}
    } else if (quantity !== undefined) {
      const qty = parseInt(quantity);
      product.quantity = qty;
      if (qty === 0 && product.status === 'active') product.status = 'out_of_stock';
      if (qty > 0 && product.status === 'out_of_stock') product.status = 'active';
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (req.user.role !== 'admin' && product.sellerId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Use findByIdAndUpdate to avoid schema validation on old/mismatched data
    await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'deleted' } },
      { strict: false }
    );

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('deleteProduct error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };