const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { getRecentEvents } = require('../agent/monitoring-connector');

/**
 * GET /activity
 */
router.get('/activity', (req, res) => {
  const recent = getRecentEvents();
  res.json({
    total: recent.length,
    events: recent
  });
});

/**
 * GET /sessions
 */
router.get('/sessions', (req, res) => {
  db.all('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ sessions: rows });
  });
});

module.exports = router;
