const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const vehicles = new Map();

// Mock VIN database
const vinDatabase = {
  '1HGBH41JXMN109186': {
    year: 2021,
    make: 'Honda',
    model: 'Accord',
    oilType: 'Synthetic 0W-20',
    oilCapacity: 3.7,
    filterPartNumber: '15400-P0A-305',
    filterSize: 'Standard'
  },
  'WBADT43452G296706': {
    year: 2018,
    make: 'BMW',
    model: '328i',
    oilType: 'Synthetic 0W-30',
    oilCapacity: 4.5,
    filterPartNumber: '11427953555',
    filterSize: 'Standard'
  }
};

// VIN Lookup
router.get('/vin/:vin', verifyToken, (req, res) => {
  try {
    const vin = req.params.vin.toUpperCase();
    const vinData = vinDatabase[vin];

    if (!vinData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'VIN not found in database. In production, this would call an external VIN decoder API.'
      });
    }

    logger.info(`VIN lookup: ${vin}`);
    res.json({
      vin,
      ...vinData
    });
  } catch (error) {
    logger.error(`VIN lookup error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Create vehicle
router.post('/', verifyToken, (req, res) => {
  try {
    const { customerId, vin, licensePlate, year, make, model, color, mileage } = req.body;

    if (!customerId || !vin) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: customerId, vin'
      });
    }

    const vehicleId = uuidv4();
    // Look up VIN specs
    const vinData = vinDatabase[vin.toUpperCase()] || {};

    const vehicle = {
      id: vehicleId,
      customerId,
      vin,
      licensePlate,
      year: year || vinData.year,
      make: make || vinData.make,
      model: model || vinData.model,
      color,
      mileage: mileage || 0,
      oilType: vinData.oilType,
      oilCapacity: vinData.oilCapacity,
      filterPartNumber: vinData.filterPartNumber,
      lastRotationDate: null,
      lastRotationMiles: 0,
      nextRotationDueMiles: (mileage || 0) + 5000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    vehicles.set(vehicleId, vehicle);
    logger.info(`Vehicle created: ${vehicleId}`);

    res.status(201).json(vehicle);
  } catch (error) {
    logger.error(`Create vehicle error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get vehicle by ID
router.get('/:vehicleId', verifyToken, (req, res) => {
  try {
    const vehicle = vehicles.get(req.params.vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vehicle not found'
      });
    }
    res.json(vehicle);
  } catch (error) {
    logger.error(`Get vehicle error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Update vehicle
router.put('/:vehicleId', verifyToken, (req, res) => {
  try {
    const vehicle = vehicles.get(req.params.vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vehicle not found'
      });
    }

    const updated = {
      ...vehicle,
      ...req.body,
      id: vehicle.id,
      customerId: vehicle.customerId,
      vin: vehicle.vin,
      createdAt: vehicle.createdAt,
      updatedAt: new Date().toISOString()
    };

    vehicles.set(req.params.vehicleId, updated);
    logger.info(`Vehicle updated: ${req.params.vehicleId}`);

    res.json(updated);
  } catch (error) {
    logger.error(`Update vehicle error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
