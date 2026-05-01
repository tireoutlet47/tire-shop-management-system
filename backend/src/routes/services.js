const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const services = new Map();
let serviceCounter = 1000;

// Get all services
router.get('/', verifyToken, (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let allServices = Array.from(services.values());

    if (status) {
      allServices = allServices.filter(s => s.status === status);
    }

    const total = allServices.length;
    const startIndex = (page - 1) * limit;
    const paginatedServices = allServices.slice(startIndex, startIndex + limit);

    res.json({
      data: paginatedServices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get services error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Create service
router.post('/', verifyToken, (req, res) => {
  try {
    const { customerId, vehicleId, serviceType, description, technicianId, scheduledDate, estimatedCost, items } = req.body;

    if (!customerId || !vehicleId || !serviceType) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: customerId, vehicleId, serviceType'
      });
    }

    const serviceId = uuidv4();
    const serviceNumber = `SVC-2026-${++serviceCounter}`;

    const service = {
      id: serviceId,
      serviceNumber,
      customerId,
      vehicleId,
      serviceType,
      description,
      status: 'pending',
      technicianId,
      scheduledDate,
      startTime: null,
      completionTime: null,
      estimatedCost: estimatedCost || 0,
      actualCost: 0,
      items: items || [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    services.set(serviceId, service);
    logger.info(`Service created: ${serviceNumber}`);

    res.status(201).json(service);
  } catch (error) {
    logger.error(`Create service error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get service by ID
router.get('/:serviceId', verifyToken, (req, res) => {
  try {
    const service = services.get(req.params.serviceId);
    if (!service) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Service not found'
      });
    }
    res.json(service);
  } catch (error) {
    logger.error(`Get service error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Update service
router.put('/:serviceId', verifyToken, (req, res) => {
  try {
    const service = services.get(req.params.serviceId);
    if (!service) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Service not found'
      });
    }

    const updated = {
      ...service,
      ...req.body,
      id: service.id,
      serviceNumber: service.serviceNumber,
      customerId: service.customerId,
      vehicleId: service.vehicleId,
      createdAt: service.createdAt,
      updatedAt: new Date().toISOString()
    };

    services.set(req.params.serviceId, updated);
    logger.info(`Service updated: ${req.params.serviceId}`);

    res.json(updated);
  } catch (error) {
    logger.error(`Update service error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Upload photos (mock)
router.post('/:serviceId/photos', verifyToken, (req, res) => {
  try {
    const service = services.get(req.params.serviceId);
    if (!service) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Service not found'
      });
    }

    // Mock photo upload - in production, use AWS S3
    const photos = [
      {
        id: uuidv4(),
        serviceId: req.params.serviceId,
        photoType: req.body.photoType || 'after',
        url: 'https://s3.amazonaws.com/tire-shop/mock-photo.jpg',
        uploadedAt: new Date().toISOString()
      }
    ];

    logger.info(`Photos uploaded for service: ${req.params.serviceId}`);

    res.status(201).json({ photos });
  } catch (error) {
    logger.error(`Upload photos error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
