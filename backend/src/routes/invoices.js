const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const invoices = new Map();
let invoiceCounter = 5000;

// Get all invoices
router.get('/', verifyToken, (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
    let allInvoices = Array.from(invoices.values());

    if (status) {
      allInvoices = allInvoices.filter(i => i.status === status);
    }

    const total = allInvoices.length;
    const startIndex = (page - 1) * limit;
    const paginatedInvoices = allInvoices.slice(startIndex, startIndex + limit);

    res.json({
      data: paginatedInvoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get invoices error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
router.post('/', verifyToken, (req, res) => {
  try {
    const { serviceId, customerId, discount = 0, taxRate = 0.1, notes } = req.body;

    if (!serviceId || !customerId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: serviceId, customerId'
      });
    }

    const invoiceId = uuidv4();
    const invoiceNumber = `INV-2026-${++invoiceCounter}`;
    const subtotal = 500; // Mock value
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * taxRate;
    const total = taxableAmount + taxAmount;

    const invoice = {
      id: invoiceId,
      invoiceNumber,
      customerId,
      serviceId,
      items: [
        { description: 'Service charges', quantity: 1, unitPrice: subtotal, lineTotal: subtotal }
      ],
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      status: 'pending',
      issuedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paidDate: null,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    invoices.set(invoiceId, invoice);
    logger.info(`Invoice created: ${invoiceNumber}`);

    res.status(201).json(invoice);
  } catch (error) {
    logger.error(`Create invoice error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
router.get('/:invoiceId', verifyToken, (req, res) => {
  try {
    const invoice = invoices.get(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found'
      });
    }
    res.json(invoice);
  } catch (error) {
    logger.error(`Get invoice error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Record payment
router.post('/:invoiceId/payment', verifyToken, (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, notes } = req.body;
    const invoice = invoices.get(req.params.invoiceId);

    if (!invoice) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found'
      });
    }

    if (!amount || !paymentMethod) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: amount, paymentMethod'
      });
    }

    invoice.status = amount >= invoice.total ? 'paid' : 'partial';
    invoice.paidDate = new Date().toISOString().split('T')[0];
    invoice.updatedAt = new Date().toISOString();

    invoices.set(req.params.invoiceId, invoice);
    logger.info(`Payment recorded for invoice: ${req.params.invoiceId}`);

    res.json(invoice);
  } catch (error) {
    logger.error(`Record payment error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
