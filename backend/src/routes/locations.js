const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const locationCache = new Map(); // In-memory cache for real-time locations

// Update technician location
router.post('/', verifyToken, (req, res) => {
  try {
    const { latitude, longitude, serviceId, accuracy } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: latitude, longitude'
      });
    }

    const location = {
      technicianId: req.user.id,
      serviceId,
      latitude,
      longitude,
      accuracy,
      timestamp: new Date().toISOString()
    };

    locationCache.set(serviceId || req.user.id, location);
    logger.info(`Location updated for technician: ${req.user.id}`);

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    logger.error(`Update location error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get technician location for service
router.get('/:serviceId', verifyToken, (req, res) => {
  try {
    const location = locationCache.get(req.params.serviceId);

    if (!location) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active location for this service'
      });
    }

    res.json(location);
  } catch (error) {
    logger.error(`Get location error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
