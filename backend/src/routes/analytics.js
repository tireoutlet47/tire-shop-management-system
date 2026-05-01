const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get dashboard metrics
router.get('/dashboard', verifyToken, (req, res) => {
  try {
    const metrics = {
      todayRevenue: 4250.50,
      servicesCompleted: 12,
      activeTechnicians: 4,
      pendingInvoices: 8,
      inventoryWarnings: 3,
      newCustomers: 5
    };

    logger.info('Dashboard metrics retrieved');
    res.json(metrics);
  } catch (error) {
    logger.error(`Get dashboard metrics error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get sales report
router.get('/sales', verifyToken, (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required query parameters: startDate, endDate'
      });
    }

    const report = {
      period: { startDate, endDate },
      totalRevenue: 15420.75,
      totalServices: 48,
      averageServiceValue: 321.27,
      data: [
        { date: startDate, revenue: 2150.00, services: 6 },
        { date: endDate, revenue: 2200.50, services: 7 }
      ]
    };

    logger.info(`Sales report generated for period: ${startDate} to ${endDate}`);
    res.json(report);
  } catch (error) {
    logger.error(`Get sales report error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get customer analytics
router.get('/customers', verifyToken, (req, res) => {
  try {
    const analytics = {
      totalCustomers: 142,
      newCustomersThisMonth: 18,
      retentionRate: 0.92,
      averageCustomerValue: 2145.50,
      topCustomers: [
        { id: 'cust-001', name: 'John Doe', totalSpent: 8950.00 },
        { id: 'cust-002', name: 'Jane Smith', totalSpent: 7250.50 }
      ]
    };

    logger.info('Customer analytics retrieved');
    res.json(analytics);
  } catch (error) {
    logger.error(`Get customer analytics error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get technician metrics
router.get('/technicians', verifyToken, (req, res) => {
  try {
    const metrics = {
      technicians: [
        {
          id: 'tech-001',
          name: 'Mike Johnson',
          servicesCompleted: 128,
          averageServiceTime: 1.5,
          revenue: 12450.00,
          rating: 4.8
        },
        {
          id: 'tech-002',
          name: 'Sarah Williams',
          servicesCompleted: 115,
          averageServiceTime: 1.4,
          revenue: 11200.50,
          rating: 4.7
        }
      ]
    };

    logger.info('Technician metrics retrieved');
    res.json(metrics);
  } catch (error) {
    logger.error(`Get technician metrics error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.module = router;
