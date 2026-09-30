const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { recordEvent, getRecentEvents } = require('../agent/monitoring-connector');
const { db } = require('../db');

// Helper to delay for realistic temporal spacing
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET /demo/events
 * Returns the recent event stream for the demo panel
 */
router.get('/events', (req, res) => {
  res.json({ events: getRecentEvents() });
});

/**
 * Scenario A: Normal Activity
 * Flow: Login -> Session created -> Resource access (report.pdf) -> Logout
 */
router.post('/normal-activity', async (req, res) => {
  const userId = (req.body && req.body.user_id) || 'U001';
  const ip = '192.168.1.25';
  const sessionId = `S-${Date.now().toString(36)}-${uuidv4().substring(0, 4).toUpperCase()}`;

  const sequence = [];

  // 1. Successful Login
  const e1 = recordEvent({
    user_id: userId,
    session_id: sessionId,
    event_type: 'login_success',
    ip,
    status: 'success',
    metadata: { note: 'Regular morning login' }
  });
  sequence.push(e1);

  await sleep(150);

  // 2. Resource Access
  const e2 = recordEvent({
    user_id: userId,
    session_id: sessionId,
    event_type: 'resource_access',
    ip,
    resource: 'report.pdf',
    status: 'success',
    metadata: { action: 'view_document' }
  });
  sequence.push(e2);

  await sleep(150);

  // 3. Clean Logout
  const e3 = recordEvent({
    user_id: userId,
    session_id: sessionId,
    event_type: 'logout',
    ip,
    status: 'success'
  });
  sequence.push(e3);

  res.json({
    scenario: 'Normal Activity',
    message: 'Generated 3 normal application events (login -> resource -> logout)',
    events: sequence
  });
});

/**
 * Scenario B: Repeated Authentication Failure
 * Flow: 5 failed logins for U001 in rapid succession, followed by 1 successful login
 */
router.post('/repeated-failed-login', async (req, res) => {
  const userId = (req.body && req.body.user_id) || 'U001';
  const ip = '192.168.1.85';
  const sequence = [];

  // Emit 5 failed login attempts
  for (let i = 1; i <= 5; i++) {
    const e = recordEvent({
      user_id: userId,
      session_id: null,
      event_type: 'login_failed',
      ip,
      status: 'failed',
      metadata: {
        attempt_number: i,
        reason: 'incorrect_password_hash'
      }
    });
    sequence.push(e);
    await sleep(80);
  }

  // Followed by a successful login
  const sessionId = `S-${Date.now().toString(36)}-${uuidv4().substring(0, 4).toUpperCase()}`;
  const successEvent = recordEvent({
    user_id: userId,
    session_id: sessionId,
    event_type: 'login_success',
    ip,
    status: 'success',
    metadata: { note: 'Successful authentication after retries' }
  });
  sequence.push(successEvent);

  res.json({
    scenario: 'Repeated Authentication Failure',
    message: 'Generated 5 failed logins followed by 1 successful login for ' + userId,
    events: sequence
  });
});

/**
 * Scenario C: Suspicious Login Sequence
 * Flow: Failed logins -> Successful login -> New External IP -> Critical sensitive file access
 */
router.post('/suspicious-login-sequence', async (req, res) => {
  const userId = (req.body && req.body.user_id) || 'U003';
  const internalIp = '192.168.1.42';
  const externalUntrustedIp = '203.0.113.88'; // External / foreign IP
  const sequence = [];

  // 1. Initial 2 failed logins
  for (let i = 1; i <= 2; i++) {
    sequence.push(
      recordEvent({
        user_id: userId,
        session_id: null,
        event_type: 'login_failed',
        ip: internalIp,
        status: 'failed',
        metadata: { attempt: i }
      })
    );
    await sleep(100);
  }

  // 2. Successful login from new external IP
  const sessionId = `S-${Date.now().toString(36)}-${uuidv4().substring(0, 4).toUpperCase()}`;
  sequence.push(
    recordEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: 'login_success',
      ip: externalUntrustedIp,
      status: 'success',
      metadata: { anomalous_origin: true }
    })
  );

  await sleep(150);

  // 3. Direct sensitive resource access
  sequence.push(
    recordEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: 'resource_access',
      ip: externalUntrustedIp,
      resource: 'system_config.json',
      status: 'success',
      metadata: { sensitivity: 'CRITICAL_INTERNAL', target: 'production_secrets' }
    })
  );

  res.json({
    scenario: 'Suspicious Login Sequence',
    message: 'Generated failed logins -> success from new IP -> sensitive file access for ' + userId,
    events: sequence
  });
});

/**
 * Scenario D: Multiple IP Activity
 * Flow: Same user active across 3 distinct IP addresses within a tight timeframe
 */
router.post('/multiple-ip-activity', async (req, res) => {
  const userId = (req.body && req.body.user_id) || 'U002';
  const ips = ['192.168.1.110', '10.24.8.45', '172.16.90.12'];
  const sequence = [];

  for (let i = 0; i < ips.length; i++) {
    const currentIp = ips[i];
    const sessionId = `S-${Date.now().toString(36)}-${uuidv4().substring(0, 4).toUpperCase()}`;

    // Login from this IP
    sequence.push(
      recordEvent({
        user_id: userId,
        session_id: sessionId,
        event_type: 'login_success',
        ip: currentIp,
        status: 'success',
        metadata: { location_pool: `pool_${i + 1}` }
      })
    );

    await sleep(100);

    // Activity from this IP
    sequence.push(
      recordEvent({
        user_id: userId,
        session_id: sessionId,
        event_type: 'resource_access',
        ip: currentIp,
        resource: 'finance_q3.xlsx',
        status: 'success'
      })
    );

    await sleep(100);
  }

  res.json({
    scenario: 'Multiple IP Activity',
    message: `Generated concurrent activities across ${ips.length} distinct IPs for ${userId}`,
    events: sequence
  });
});

/**
 * Scenario E: Abnormal API Activity
 * Flow: Rapid burst of 25 API requests in under 2 seconds
 */
router.post('/abnormal-api-activity', async (req, res) => {
  const userId = (req.body && req.body.user_id) || 'U004';
  const ip = '192.168.1.77';
  const sessionId = `S-${Date.now().toString(36)}-${uuidv4().substring(0, 4).toUpperCase()}`;
  const endpoints = ['/profile', '/files', '/activity', '/users', '/sessions'];
  const sequence = [];

  for (let i = 1; i <= 25; i++) {
    const ep = endpoints[i % endpoints.length];
    const e = recordEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: 'api_request',
      ip,
      resource: ep,
      status: 'success',
      metadata: { burst_index: i, method: 'GET' }
    });
    sequence.push(e);
    await sleep(35); // Rapid 35ms spacing
  }

  res.json({
    scenario: 'Abnormal API Activity',
    message: `Generated burst of 25 rapid API requests in < 2 seconds for ${userId}`,
    events_count: sequence.length
  });
});

/**
 * Scenario F: Nighttime Lull Simulation (11 PM - 4 AM)
 * Demonstrates Module 8 (Media Upload) dropping to 0 activity, confirming safe downtime window.
 */
router.post('/module-night-lull', async (req, res) => {
  const sequence = [];
  const nightEvents = [
    { user_id: 'U001', module_id: 'MOD-01', module_name: 'Authentication & Lock', event_type: 'session_heartbeat', res: 'auth_token_refresh' },
    { user_id: 'U002', module_id: 'MOD-09', module_name: 'End-to-End Key Sync', event_type: 'key_bundle_sync', res: 'prekey_bundle_rot' },
    { user_id: 'U003', module_id: 'MOD-04', module_name: 'File Access Vault', event_type: 'cache_sync', res: 'vault_checkpoint.dat' }
  ];

  for (const item of nightEvents) {
    const e = recordEvent({
      user_id: item.user_id,
      session_id: `S-NIGHT-${item.user_id}`,
      event_type: item.event_type,
      ip: '192.168.1.45',
      resource: item.res,
      status: 'success',
      metadata: {
        module_id: item.module_id,
        module_name: item.module_name,
        time_window: '23:00 - 04:00 (Safe Night Window)',
        active_media_uploads: 0
      }
    });
    sequence.push(e);
    await sleep(80);
  }

  res.json({
    scenario: 'Nighttime Lull Simulation',
    message: 'Generated night shift events with 0 active uploads on Module 8 (Optimal Downtime Window)',
    events: sequence
  });
});

/**
 * Scenario G: Specific Module User Interaction
 */
router.post('/module-user-action', async (req, res) => {
  const { user_id = 'U005', module_id = 'MOD-08', action = 'Media Upload Chunk', resource = 'media_chunk_01.mp4' } = req.body || {};
  const e = recordEvent({
    user_id,
    session_id: `S-${user_id}-MOD`,
    event_type: 'module_interaction',
    ip: '192.168.1.89',
    resource,
    status: 'success',
    metadata: {
      module_id,
      action
    }
  });

  res.json({
    scenario: 'Module User Interaction',
    event: e
  });
});

module.exports = router;

