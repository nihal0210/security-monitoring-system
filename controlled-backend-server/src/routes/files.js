const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { recordEvent } = require('../agent/monitoring-connector');

/**
 * GET /files
 */
router.get('/files', (req, res) => {
  db.all('SELECT resource_id, filename, classification, size_kb, description FROM resources', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ files: rows });
  });
});

/**
 * GET /files/:filename
 * Simulates accessing a file resource
 */
router.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const userId = req.query.user_id || req.headers['x-user-id'] || 'U001';
  const sessionId = req.query.session_id || req.headers['x-session-id'] || null;
  const ip = req.query.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '192.168.1.20';

  db.get('SELECT * FROM resources WHERE filename = ?', [filename], (err, file) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const event = recordEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: 'resource_access',
      ip,
      resource: file.filename,
      status: 'success',
      metadata: {
        classification: file.classification,
        size_kb: file.size_kb
      }
    });

    res.json({
      success: true,
      file: {
        resource_id: file.resource_id,
        filename: file.filename,
        classification: file.classification,
        description: file.description,
        download_url: `/files/${file.filename}`
      },
      event_recorded: event
    });
  });
});

module.exports = router;
