const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { recordEvent } = require('../agent/monitoring-connector');

/**
 * POST /login
 * Body: { user_id, password, ip }
 */
router.post('/login', (req, res) => {
  const { user_id, password } = req.body;
  const ip = req.body.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '192.168.1.20';
  const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

  if (!user_id || !password) {
    recordEvent({
      user_id: user_id || 'UNKNOWN',
      event_type: 'login_failed',
      ip,
      status: 'failed',
      metadata: { reason: 'missing_credentials' }
    });
    return res.status(400).json({ error: 'user_id and password are required' });
  }

  db.get('SELECT * FROM users WHERE user_id = ? OR email = ?', [user_id, user_id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user || user.password !== password) {
      // Failed login event
      const event = recordEvent({
        user_id: user ? user.user_id : user_id,
        session_id: null,
        event_type: 'login_failed',
        ip,
        status: 'failed',
        metadata: { reason: 'invalid_credentials' }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        event_recorded: event
      });
    }

    // Success login
    const sessionId = `S-${Date.now().toString(36)}-${uuidv4().substring(0, 4).toUpperCase()}`;

    db.run(
      'INSERT INTO sessions (session_id, user_id, ip, user_agent, status) VALUES (?, ?, ?, ?, ?)',
      [sessionId, user.user_id, ip, userAgent, 'active'],
      (insertErr) => {
        if (insertErr) {
          console.error('[ControlledBackend] Error creating session:', insertErr);
        }

        const event = recordEvent({
          user_id: user.user_id,
          session_id: sessionId,
          event_type: 'login_success',
          ip,
          status: 'success',
          metadata: {
            department: user.department,
            role: user.role
          }
        });

        res.json({
          success: true,
          message: 'Login successful',
          session_id: sessionId,
          user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            department: user.department,
            role: user.role
          },
          event_recorded: event
        });
      }
    );
  });
});

/**
 * POST /logout
 * Body: { session_id, user_id }
 */
router.post('/logout', (req, res) => {
  const sessionId = req.body.session_id || req.headers['x-session-id'];
  const userId = req.body.user_id;
  const ip = req.body.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '192.168.1.20';

  if (!sessionId) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  db.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId], (err, session) => {
    if (session) {
      db.run(
        'UPDATE sessions SET status = "terminated", ended_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [sessionId]
      );
    }

    const resolvedUserId = session ? session.user_id : (userId || 'UNKNOWN');

    const event = recordEvent({
      user_id: resolvedUserId,
      session_id: sessionId,
      event_type: 'logout',
      ip,
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
      event_recorded: event
    });
  });
});

module.exports = router;
