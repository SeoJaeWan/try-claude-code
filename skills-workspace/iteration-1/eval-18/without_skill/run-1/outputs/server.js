const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// In-memory data store
const products = new Map();

// Seed some sample data
const sampleProducts = [
  { name: 'Laptop', description: 'High-performance laptop', price: 999.99, category: 'Electronics', stock: 50 },
  { name: 'Headphones', description: 'Noise-cancelling headphones', price: 199.99, category: 'Electronics', stock: 120 },
  { name: 'Desk Chair', description: 'Ergonomic office chair', price: 349.99, category: 'Furniture', stock: 30 },
];

sampleProducts.forEach((product) => {
  const id = uuidv4();
  products.set(id, {
    id,
    ...product,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

// --- Validation helpers ---

function validateProduct(body, isUpdate = false) {
  const errors = [];

  if (!isUpdate || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.push('name is required and must be a non-empty string');
    }
  }

  if (!isUpdate || body.price !== undefined) {
    if (body.price === undefined || body.price === null || typeof body.price !== 'number' || body.price < 0) {
      errors.push('price is required and must be a non-negative number');
    }
  }

  if (body.stock !== undefined) {
    if (typeof body.stock !== 'number' || !Number.isInteger(body.stock) || body.stock < 0) {
      errors.push('stock must be a non-negative integer');
    }
  }

  return errors;
}

// --- Routes ---

// GET /api/products - List all products (with optional filtering)
app.get('/api/products', (req, res) => {
  let result = Array.from(products.values());

  // Filter by category
  if (req.query.category) {
    result = result.filter(
      (p) => p.category && p.category.toLowerCase() === req.query.category.toLowerCase()
    );
  }

  // Filter by minimum price
  if (req.query.minPrice) {
    const minPrice = parseFloat(req.query.minPrice);
    if (!isNaN(minPrice)) {
      result = result.filter((p) => p.price >= minPrice);
    }
  }

  // Filter by maximum price
  if (req.query.maxPrice) {
    const maxPrice = parseFloat(req.query.maxPrice);
    if (!isNaN(maxPrice)) {
      result = result.filter((p) => p.price <= maxPrice);
    }
  }

  // Sort
  if (req.query.sortBy) {
    const sortBy = req.query.sortBy;
    const order = req.query.order === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return -1 * order;
      if (a[sortBy] > b[sortBy]) return 1 * order;
      return 0;
    });
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedResult = result.slice(startIndex, endIndex);

  res.json({
    data: paginatedResult,
    meta: {
      total: result.length,
      page,
      limit,
      totalPages: Math.ceil(result.length / limit),
    },
  });
});

// GET /api/products/:id - Get a single product
app.get('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Product with id '${req.params.id}' not found`,
    });
  }

  res.json({ data: product });
});

// POST /api/products - Create a new product
app.post('/api/products', (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  const product = {
    id,
    name: req.body.name.trim(),
    description: req.body.description || '',
    price: req.body.price,
    category: req.body.category || 'Uncategorized',
    stock: req.body.stock !== undefined ? req.body.stock : 0,
    createdAt: now,
    updatedAt: now,
  };

  products.set(id, product);

  res.status(201).json({ data: product });
});

// PUT /api/products/:id - Full update of a product
app.put('/api/products/:id', (req, res) => {
  const existing = products.get(req.params.id);

  if (!existing) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Product with id '${req.params.id}' not found`,
    });
  }

  const errors = validateProduct(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
  }

  const now = new Date().toISOString();

  const updated = {
    id: existing.id,
    name: req.body.name.trim(),
    description: req.body.description || '',
    price: req.body.price,
    category: req.body.category || 'Uncategorized',
    stock: req.body.stock !== undefined ? req.body.stock : 0,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  products.set(existing.id, updated);

  res.json({ data: updated });
});

// PATCH /api/products/:id - Partial update of a product
app.patch('/api/products/:id', (req, res) => {
  const existing = products.get(req.params.id);

  if (!existing) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Product with id '${req.params.id}' not found`,
    });
  }

  const errors = validateProduct(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
  }

  const now = new Date().toISOString();
  const allowedFields = ['name', 'description', 'price', 'category', 'stock'];

  const updated = { ...existing, updatedAt: now };
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updated[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
    }
  }

  products.set(existing.id, updated);

  res.json({ data: updated });
});

// DELETE /api/products/:id - Delete a product
app.delete('/api/products/:id', (req, res) => {
  const existing = products.get(req.params.id);

  if (!existing) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Product with id '${req.params.id}' not found`,
    });
  }

  products.delete(req.params.id);

  res.status(204).send();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Products API running on http://localhost:${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  GET    /api/products      - List all products`);
    console.log(`  GET    /api/products/:id   - Get a product`);
    console.log(`  POST   /api/products       - Create a product`);
    console.log(`  PUT    /api/products/:id   - Full update a product`);
    console.log(`  PATCH  /api/products/:id   - Partial update a product`);
    console.log(`  DELETE /api/products/:id   - Delete a product`);
    console.log(`  GET    /api/health         - Health check`);
  });
}

module.exports = app;
