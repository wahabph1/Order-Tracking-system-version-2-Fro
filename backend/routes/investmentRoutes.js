// Backend/routes/investmentRoutes.js
const express = require('express');
const router = express.Router();
const Investment = require('../db/models/Investment');

// Create a new investment record
router.post('/', async (req, res) => {
  try {
    const { amount, note, currency, date, source } = req.body || {};

    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: 'amount is required' });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      return res.status(400).json({ message: 'amount must be a non-negative number' });
    }

    const payload = {
      amount: amt,
      note: note ? String(note) : '',
      currency: currency ? String(currency) : undefined,
      source: source ? String(source) : 'Qatar',
    };
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) payload.date = d;
    }

    const doc = await Investment.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to save investment' });
  }
});

// List investments (optional source filter, recent first)
router.get('/', async (req, res) => {
  try {
    const { source, limit } = req.query || {};
    const q = {};
    if (source) q.source = String(source);
    const lim = Math.min(Math.max(parseInt(limit || '50', 10), 1), 500);
    const items = await Investment.find(q).sort({ date: -1, createdAt: -1 }).limit(lim).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch investments' });
  }
});

module.exports = router;