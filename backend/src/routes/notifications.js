const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const smsMessages = [];

// Send SMS notification
router.post('/sms', verifyToken, (req, res) => {
  try {
    const { customerId, message, scheduledTime } = req.body;

    if (!customerId || !message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: customerId, message'
      });
    }

    const smsRecord = {
      id: uuidv4(),
      customerId,
      message,
      status: 'queued',
      scheduledTime: scheduledTime || new Date().toISOString(),
      sentAt: null,
      deliveredAt: null,
      createdAt: new Date().toISOString()
    };

    smsMessages.push(smsRecord);
    logger.info(`SMS queued for customer: ${customerId}`);

    res.json({
      message: 'SMS notification queued successfully',
      messageId: smsRecord.id
    });
  } catch (error) {
    logger.error(`Send SMS error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
