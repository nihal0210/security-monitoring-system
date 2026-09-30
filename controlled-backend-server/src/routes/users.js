const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { recordEvent } = require('../agent/monitoring-connector');

/**
 * GET /users
 */
router.get('/users', (req, res) => {
  db.all('SELECT user_id, name, email, department, role, created_at FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ users: rows });
  });
});

/**
 * GET /profile
 * Query or Header: user_id, session_id
 */
router.get('/profile', (req, res) => {
  const userId = req.query.user_id || req.headers['x-user-id'] || 'U001';
  const sessionId = req.query.session_id || req.headers['x-session-id'] || null;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '192.168.1.20';

  db.get(
    'SELECT user_id, name, email, department, role, created_at FROM users WHERE user_id = ?',
    [userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });

      recordEvent({
        user_id: user.user_id,
        session_id: sessionId,
        event_type: 'api_request',
        ip,
        resource: '/profile',
        status: 'success',
        metadata: { endpoint: '/profile' }
      });

      res.json({ profile: user });
    }
  );
});

module.exports = router;
