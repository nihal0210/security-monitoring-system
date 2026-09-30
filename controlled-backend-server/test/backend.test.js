const assert = require('assert');
const { test, describe, before } = require('node:test');
const { initDatabase, db } = require('../src/db');
const { normalizeEvent } = require('../src/agent/monitoring-connector');

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

describe('Controlled Backend Test Environment Unit & Integration Tests', () => {
  before(async () => {
    await initDatabase();
  });

  test('Database is seeded with demo users U001 to U005', async () => {
    const rows = await queryAll('SELECT user_id, name, department FROM users ORDER BY user_id');
    assert.strictEqual(rows.length, 5, 'Should have exactly 5 demo users');
    assert.strictEqual(rows[0].user_id, 'U001');
    assert.strictEqual(rows[0].name, 'Rahul Sharma');
    assert.strictEqual(rows[1].user_id, 'U002');
    assert.strictEqual(rows[4].user_id, 'U005');
  });

  test('Database is seeded with standard and sensitive resources', async () => {
    const rows = await queryAll('SELECT resource_id, filename, classification FROM resources');
    assert.ok(rows.length >= 5, 'Should have at least 5 seeded resources');
    const filenames = rows.map((r) => r.filename);
    assert.ok(filenames.includes('report.pdf'));
    assert.ok(filenames.includes('system_config.json'));
    assert.ok(filenames.includes('finance_q3.xlsx'));
  });

  test('Event Normalizer produces valid Common Event Schema', () => {
    const raw = {
      user_id: 'U001',
      session_id: 'S001',
      event_type: 'resource_access',
      ip: '192.168.1.50',
      resource: 'report.pdf',
      status: 'success'
    };

    const normalized = normalizeEvent(raw);
    assert.ok(normalized.event_id, 'Must generate event_id');
    assert.strictEqual(normalized.user_id, 'U001');
    assert.strictEqual(normalized.session_id, 'S001');
    assert.strictEqual(normalized.event_type, 'resource_access');
    assert.strictEqual(normalized.ip, '192.168.1.50');
    assert.strictEqual(normalized.resource, 'report.pdf');
    assert.strictEqual(normalized.source, 'nodejs-demo');
    assert.strictEqual(normalized.status, 'success');
    assert.strictEqual(normalized.security_flag, false);
    assert.ok(normalized.timestamp, 'Must have timestamp');
  });

  test('Failed login preserves null session_id and failed status', () => {
    const raw = {
      user_id: 'U001',
      session_id: null,
      event_type: 'login_failed',
      ip: '192.168.1.80',
      status: 'failed'
    };

    const normalized = normalizeEvent(raw);
    assert.strictEqual(normalized.session_id, null);
    assert.strictEqual(normalized.event_type, 'login_failed');
    assert.strictEqual(normalized.status, 'failed');
  });
});
