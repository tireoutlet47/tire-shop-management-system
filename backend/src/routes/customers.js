const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Mock database
const customers = new Map();

// Get all customers
router.get('/', verifyToken, (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    let allCustomers = Array.from(customers.values());

    if (search) {
      allCustomers = allCustomers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      );
    }

    const total = allCustomers.length;
    const startIndex = (page - 1) * limit;
    const paginatedCustomers = allCustomers.slice(startIndex, startIndex + limit);

    res.json({
      data: paginatedCustomers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get customers error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Create customer
router.post('/', verifyToken, (req, res) => {
  try {
    const { name, phone, email, address, city, state, zipCode } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: name, phone, email'
      });
    }

    const customerId = uuidv4();
    const customer = {
      id: customerId,
      name,
      phone,
      email,
      address,
      city,
      state,
      zipCode,
      loyaltyPoints: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    customers.set(customerId, customer);
    logger.info(`Customer created: ${customerId}`);

    res.status(201).json(customer);
  } catch (error) {
    logger.error(`Create customer error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID
router.get('/:customerId', verifyToken, (req, res) => {
  try {
    const customer = customers.get(req.params.customerId);
    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found'
      });
    }
    res.json(customer);
  } catch (error) {
    logger.error(`Get customer error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:customerId', verifyToken, (req, res) => {
  try {
    const customer = customers.get(req.params.customerId);
    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found'
      });
    }

    const updated = {
      ...customer,
      ...req.body,
      id: customer.id,
      createdAt: customer.createdAt,
      updatedAt: new Date().toISOString()
    };

    customers.set(req.params.customerId, updated);
    logger.info(`Customer updated: ${req.params.customerId}`);

    res.json(updated);
  } catch (error) {
    logger.error(`Update customer error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
router.delete('/:customerId', verifyToken, (req, res) => {
  try {
    if (!customers.has(req.params.customerId)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found'
      });
    }

    customers.delete(req.params.customerId);
    logger.info(`Customer deleted: ${req.params.customerId}`);

    res.status(204).send();
  } catch (error) {
    logger.error(`Delete customer error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
