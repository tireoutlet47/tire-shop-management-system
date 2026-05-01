const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const inventory = new Map();
const transactions = [];

// Get all inventory items
router.get('/', verifyToken, (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    let items = Array.from(inventory.values());

    if (category) {
      items = items.filter(item => item.category === category);
    }

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    res.json({
      data: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get inventory error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Create inventory item
router.post('/', verifyToken, (req, res) => {
  try {
    const { name, category, quantity, unitCost, sellingPrice, sku, reorderLevel, supplier, specifications } = req.body;

    if (!name || !category || quantity === undefined || !unitCost) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields'
      });
    }

    const itemId = uuidv4();
    const item = {
      id: itemId,
      name,
      category,
      quantity,
      unitCost,
      sellingPrice: sellingPrice || unitCost * 1.5,
      sku: sku || itemId.substr(0, 8).toUpperCase(),
      reorderLevel: reorderLevel || 10,
      supplier,
      specifications: specifications || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inventory.set(itemId, item);
    logger.info(`Inventory item created: ${itemId}`);

    res.status(201).json(item);
  } catch (error) {
    logger.error(`Create inventory error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get inventory item
router.get('/:itemId', verifyToken, (req, res) => {
  try {
    const item = inventory.get(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Inventory item not found'
      });
    }
    res.json(item);
  } catch (error) {
    logger.error(`Get inventory item error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Update inventory item
router.put('/:itemId', verifyToken, (req, res) => {
  try {
    const item = inventory.get(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Inventory item not found'
      });
    }

    const updated = {
      ...item,
      ...req.body,
      id: item.id,
      createdAt: item.createdAt,
      updatedAt: new Date().toISOString()
    };

    inventory.set(req.params.itemId, updated);
    logger.info(`Inventory item updated: ${req.params.itemId}`);

    res.json(updated);
  } catch (error) {
    logger.error(`Update inventory error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Adjust inventory
router.post('/:itemId/adjust', verifyToken, (req, res) => {
  try {
    const { quantity, reason, notes } = req.body;
    const item = inventory.get(req.params.itemId);

    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Inventory item not found'
      });
    }

    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity + quantity;

    if (newQuantity < 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Adjustment would result in negative inventory'
      });
    }

    item.quantity = newQuantity;
    item.updatedAt = new Date().toISOString();

    transactions.push({
      id: uuidv4(),
      inventoryItemId: req.params.itemId,
      transactionType: reason,
      quantityChange: quantity,
      previousQuantity,
      newQuantity,
      notes,
      createdAt: new Date().toISOString()
    });

    logger.info(`Inventory adjusted: ${req.params.itemId} (${quantity})`);

    res.json(item);
  } catch (error) {
    logger.error(`Adjust inventory error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
