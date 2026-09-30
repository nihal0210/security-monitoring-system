const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// In-memory buffer of recent generated events (last 100)
const eventBuffer = [];
const MAX_BUFFER = 100;

// Retry queue for events pending transmission to the monitoring platform
const pendingQueue = [];
let isShipping = false;

/**
 * Normalizes backend event to the Common Event Schema.
 */
function normalizeEvent(raw) {
  return {
    event_id: raw.event_id || `E-${Date.now()}-${uuidv4().substring(0, 8)}`,
    user_id: raw.user_id || null,
    session_id: raw.session_id || null,
    event_type: raw.event_type || 'generic_activity',
    timestamp: raw.timestamp || new Date().toISOString(),
    ip: raw.ip || '127.0.0.1',
    resource: raw.resource || null,
    source: raw.source || 'nodejs-demo',
    status: raw.status || 'success',
    security_flag: Boolean(raw.security_flag),
    metadata: raw.metadata || {}
  };
}

/**
 * Asynchronously posts event to the central Monitoring Platform ingestion endpoint.
 */
async function shipToMonitoringPlatform(normalizedEvent) {
  try {
    const response = await fetch(config.MONITORING_PLATFORM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(normalizedEvent),
      // Short timeout to prevent hanging if monitoring platform is starting up
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      // Shipped successfully
      return true;
    } else {
      console.warn(`[MonitoringConnector] Ingestion responded with status ${response.status}`);
      return false;
    }
  } catch (err) {
    // Graceful error logging - do not crash controlled server
    // (Platform may be temporarily offline or starting up)
    return false;
  }
}

async function processQueue() {
  if (isShipping || pendingQueue.length === 0) return;
  isShipping = true;

  try {
    while (pendingQueue.length > 0) {
      const event = pendingQueue[0];
      const success = await shipToMonitoringPlatform(event);
      if (success) {
        pendingQueue.shift();
      } else {
        // If delivery failed, break and retry on next tick
        break;
      }
    }
  } finally {
    isShipping = false;
  }
}

// Periodic queue flush — every 300ms (reduced from 2000ms so burst events reach the platform within detection windows)
setInterval(processQueue, 300);

/**
 * Primary interface for the backend to record and ship an event.
 */
function recordEvent(rawEvent) {
  const normalized = normalizeEvent(rawEvent);

  // Store in circular buffer for demo UI viewing
  eventBuffer.unshift(normalized);
  if (eventBuffer.length > MAX_BUFFER) {
    eventBuffer.pop();
  }

  // Enqueue for delivery to monitoring platform
  pendingQueue.push(normalized);
  processQueue();

  return normalized;
}

function getRecentEvents() {
  return [...eventBuffer];
}

module.exports = {
  recordEvent,
  normalizeEvent,
  getRecentEvents
};
