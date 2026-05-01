const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const rotations = new Map();

// Get rotation reminders
router.get('/', verifyToken, (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let allRotations = Array.from(rotations.values());

    if (status) {
      allRotations = allRotations.filter(r => r.status === status);
    }

    const total = allRotations.length;
    const startIndex = (page - 1) * limit;
    const paginatedRotations = allRotations.slice(startIndex, startIndex + limit);

    res.json({
      data: paginatedRotations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get rotations error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
