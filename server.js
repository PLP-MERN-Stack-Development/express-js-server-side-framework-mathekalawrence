// server.js - Starter Express server for Week 2 assignment

const express = require('express');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory database (in a real app, this would be a proper database)
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop for developers',
    price: 999.99,
    category: 'Electronics',
    inStock: true
  },
  {
    id: '2',
    name: 'Coffee Mug',
    description: 'Ceramic mug for your morning coffee',
    price: 12.99,
    category: 'Home',
    inStock: true
  },
  {
    id: '3',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse',
    price: 29.99,
    category: 'Electronics',
    inStock: false
  }
];

// Custom Error Classes
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

// Middleware

// Logger middleware
const loggerMiddleware = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
};

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return next(new AuthenticationError('API key is required'));
  }
  
  if (apiKey !== process.env.API_KEY) {
    return next(new AuthenticationError('Invalid API key'));
  }
  
  next();
};

// Validation middleware for product creation and update
const validateProductMiddleware = (req, res, next) => {
  const { name, description, price, category, inStock } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Description is required and must be a non-empty string');
  }

  if (price === undefined || typeof price !== 'number' || price < 0) {
    errors.push('Price is required and must be a non-negative number');
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('Category is required and must be a non-empty string');
  }

  if (typeof inStock !== 'boolean') {
    errors.push('inStock is required and must be a boolean');
  }

  if (errors.length > 0) {
    return next(new ValidationError(errors.join(', ')));
  }

  next();
};

// Apply middleware
app.use(express.json());
app.use(loggerMiddleware);

// Routes

// GET /api/products - Getting all products with filtering, pagination, and search
app.get('/api/products', (req, res, next) => {
  try {
    let filteredProducts = [...products];
    
    // Filtering by category
    if (req.query.category) {
      filteredProducts = filteredProducts.filter(
        product => product.category.toLowerCase() === req.query.category.toLowerCase()
      );
    }
    
    // Filtering by inStock
    if (req.query.inStock) {
      const inStock = req.query.inStock.toLowerCase() === 'true';
      filteredProducts = filteredProducts.filter(product => product.inStock === inStock);
    }
    
    // Searching by name
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    res.json({
      products: paginatedProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredProducts.length / limit),
        totalProducts: filteredProducts.length,
        hasNext: endIndex < filteredProducts.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Getting a specific product by ID
app.get('/api/products/:id', (req, res, next) => {
  try {
    const product = products.find(p => p.id === req.params.id);
    
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Creatting a new product (requires authentication)
app.post('/api/products', authMiddleware, validateProductMiddleware, (req, res, next) => {
  try {
    const { name, description, price, category, inStock } = req.body;
    
    const newProduct = {
      id: uuidv4(),
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      inStock
    };
    
    products.push(newProduct);
    
    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id - Updating an existing product (requires authentication)
app.put('/api/products/:id', authMiddleware, validateProductMiddleware, (req, res, next) => {
  try {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    
    if (productIndex === -1) {
      throw new NotFoundError('Product not found');
    }
    
    const { name, description, price, category, inStock } = req.body;
    
    products[productIndex] = {
      ...products[productIndex],
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      inStock
    };
    
    res.json(products[productIndex]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id - Deleting a product (requires authentication)
app.delete('/api/products/:id', authMiddleware, (req, res, next) => {
  try {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    
    if (productIndex === -1) {
      throw new NotFoundError('Product not found');
    }
    
    products.splice(productIndex, 1);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/products/stats - Getting product statistics
app.get('/api/products/stats', (req, res, next) => {
  try {
    const stats = {
      totalProducts: products.length,
      inStock: products.filter(p => p.inStock).length,
      outOfStock: products.filter(p => !p.inStock).length,
      categories: {}
    };
    
    // Counting by category
    products.forEach(product => {
      if (!stats.categories[product.category]) {
        stats.categories[product.category] = 0;
      }
      stats.categories[product.category]++;
    });
    
    // Average price
    const totalPrice = products.reduce((sum, product) => sum + product.price, 0);
    stats.averagePrice = products.length > 0 ? totalPrice / products.length : 0;
    
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Products API',
    endpoints: {
      'GET /api/products': 'Get all products (supports filtering, pagination, search)',
      'GET /api/products/:id': 'Get a specific product',
      'POST /api/products': 'Create a new product (requires API key)',
      'PUT /api/products/:id': 'Update a product (requires API key)',
      'DELETE /api/products/:id': 'Delete a product (requires API key)',
      'GET /api/products/stats': 'Get product statistics'
    }
  });
});

// 404 handler for undefined routes
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      name: error.name || 'Error',
      message: message,
      statusCode: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
});

// Starting server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to test the API`);
});

module.exports = app;

{/*
// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.json()); 

// Sample in-memory products database
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1200,
    category: 'electronics',
    inStock: true
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model with 128GB storage',
    price: 800,
    category: 'electronics',
    inStock: true
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with timer',
    price: 50,
    category: 'kitchen',
    inStock: false
  }
];

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Product API! Go to /api/products to see all products.');
});

// TODO: Implement the following routes:
// GET /api/products - Get all products
// GET /api/products/:id - Get a specific product
// POST /api/products - Create a new product
// PUT /api/products/:id - Update a product
// DELETE /api/products/:id - Delete a product

// Example route implementation for GET /api/products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// TODO: Implement custom middleware for:
// - Request logging
// - Authentication
// - Error handling

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the app for testing purposes
module.exports = app; 
*/}