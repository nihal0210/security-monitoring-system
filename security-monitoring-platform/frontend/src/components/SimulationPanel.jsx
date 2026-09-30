import React, { useState, useEffect } from 'react';
import { broadcastTelemetry, subscribeTelemetry } from '../services/eventBus';
import { ENTERPRISE_MODULES } from '../data/modulesData';

export default function SimulationPanel({ onNavigateToDashboard }) {
  const [logs, setLogs] = useState([]);
  const [activeRunningScenario, setActiveRunningScenario] = useState(null);
  const [mod8DowntimeActive, setMod8DowntimeActive] = useState(false);

  // Subscribe to telemetry to display in the local stream log as well
  useEffect(() => {
    const unsubscribe = subscribeTelemetry((msg) => {
      if (msg.type === 'event:new') {
        setLogs(prev => [
          {
            id: msg.data.event_id || Math.random().toString(),
            time: new Date().toLocaleTimeString(),
            type: msg.data.event_type,
            user: msg.data.user_id || 'SYSTEM',
            resource: msg.data.resource || msg.data.metadata?.module_name || '—',
            status: msg.data.status || 'success',
            raw: msg.data
          },
          ...prev.slice(0, 49)
        ]);
      } else if (msg.type === 'event:alert') {
        setLogs(prev => [
          {
            id: 'ALERT-' + Date.now(),
            time: new Date().toLocaleTimeString(),
            type: '🚨 ' + (msg.data.rule_name || 'SECURITY_ALERT'),
            user: msg.data.user_id || 'UNKNOWN',
            resource: `SEVERITY: ${msg.data.severity}`,
            status: 'failed',
            raw: msg.data
          },
          ...prev.slice(0, 49)
        ]);
      } else if (msg.type === 'module:maintenance_toggle') {
        if (msg.data.moduleId === 'MOD-08') {
          setMod8DowntimeActive(msg.data.status === 'ACTIVE_DOWNTIME');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper to post an event locally & over broadcast channel & to backend API if reachable
  const dispatchEvent = async (eventData) => {
    // 1. Cross-tab Broadcast
    broadcastTelemetry('event:new', eventData);

    // 2. Try posting to FastAPI backend or Node backend if active
    try {
      fetch('/api/events/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      }).catch(() => {});
    } catch (e) {}

    // Add to local UI log
    setLogs(prev => [
      {
        id: eventData.event_id,
        time: new Date().toLocaleTimeString(),
        type: eventData.event_type,
        user: eventData.user_id || 'SYSTEM',
        resource: eventData.resource || eventData.metadata?.module_name || '—',
        status: eventData.status,
        raw: eventData
      },
      ...prev.slice(0, 49)
    ]);
  };

  const dispatchAlert = (alertData) => {
    broadcastTelemetry('event:alert', alertData);
    setLogs(prev => [
      {
        id: 'ALERT-' + Date.now(),
        time: new Date().toLocaleTimeString(),
        type: '🚨 ' + alertData.rule_name,
        user: alertData.user_id,
        resource: `SEVERITY: ${alertData.severity}`,
        status: 'failed',
        raw: alertData
      },
      ...prev.slice(0, 49)
    ]);
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  // ── Scenarios ───────────────────────────────────────────────

  // Scenario 1: Module 8 Night Lull (11 PM - 4 AM)
  const runNightLullSimulation = async () => {
    setActiveRunningScenario('night-lull');
    // Emits quiet events on other modules, exactly 0 on Module 8
    const events = [
      { user: 'U001', mod: 'MOD-01', type: 'session_heartbeat', res: 'auth_token_refresh', note: 'Deep night routine heartbeat' },
      { user: 'U002', mod: 'MOD-09', type: 'key_bundle_sync', res: 'prekey_bundle_rot', note: 'Cryptographic ratchet sync' },
      { user: 'U003', mod: 'MOD-04', type: 'cache_sync', res: 'vault_cache_checkpoint', note: 'Cold storage indexing' }
    ];

    for (const e of events) {
      const mod = ENTERPRISE_MODULES.find(m => m.id === e.mod);
      await dispatchEvent({
        event_id: `EV-NIGHT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: e.user,
        session_id: `S-NIGHT-${e.user}`,
        event_type: e.type,
        timestamp: new Date().toISOString(),
        ip: '192.168.1.45',
        resource: e.res,
        status: 'success',
        metadata: {
          module_id: e.mod,
          module_name: mod?.name,
          time_window: '23:00 - 04:00 (Safe Night Window)',
          active_media_uploads: 0
        }
      });
      await delay(250);
    }
    setActiveRunningScenario(null);
  };

  // Scenario 2: Daytime Peak Concurrency (Modules 1, 2, 7)
  const runDaytimePeakSimulation = async () => {
    setActiveRunningScenario('day-peak');
    const bursts = [
      { user: 'U001', mod: 'MOD-02', res: 'direct_msg_stream', desc: 'Direct chat conversation thread' },
      { user: 'U002', mod: 'MOD-02', res: 'direct_msg_delivery', desc: 'Direct message read receipt' },
      { user: 'U004', mod: 'MOD-07', res: 'status_story_feed', desc: 'Viewing broadcast story status' },
      { user: 'U005', mod: 'MOD-07', res: 'status_story_post', desc: 'Publishing campaign story status' },
      { user: 'U003', mod: 'MOD-01', res: 'biometric_unlock', desc: 'Biometric unlock verification' }
    ];

    for (const b of bursts) {
      const mod = ENTERPRISE_MODULES.find(m => m.id === b.mod);
      await dispatchEvent({
        event_id: `EV-PEAK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: b.user,
        session_id: `S-PEAK-${b.user}`,
        event_type: 'resource_access',
        timestamp: new Date().toISOString(),
        ip: '192.168.1.' + Math.floor(Math.random() * 80 + 20),
        resource: b.res,
        status: 'success',
        metadata: {
          module_id: b.mod,
          module_name: mod?.name,
          note: b.desc
        }
      });
      await delay(180);
    }
    setActiveRunningScenario(null);
  };

  // Scenario 3: Single User Module Interaction
  const runUserModuleAction = async (userId, moduleId, actionDesc, resource) => {
    setActiveRunningScenario(`user-${userId}-${moduleId}`);
    const mod = ENTERPRISE_MODULES.find(m => m.id === moduleId);

    await dispatchEvent({
      event_id: `EV-MOD-${Date.now()}`,
      user_id: userId,
      session_id: `S-${userId}-ACT`,
      event_type: 'module_interaction',
      timestamp: new Date().toISOString(),
      ip: '192.168.1.' + (userId === 'U001' ? '20' : userId === 'U002' ? '34' : '58'),
      resource: resource,
      status: 'success',
      metadata: {
        module_id: moduleId,
        module_name: mod?.name,
        action: actionDesc
      }
    });

    setActiveRunningScenario(null);
  };

  // Scenario 4: Toggle Module 8 Downtime / Structural Repair
  const toggleMod8Maintenance = () => {
    const next = !mod8DowntimeActive;
    setMod8DowntimeActive(next);

    broadcastTelemetry('module:maintenance_toggle', {
      moduleId: 'MOD-08',
      moduleName: 'High-Res Media Upload & Transcoding',
      status: next ? 'ACTIVE_DOWNTIME' : 'ONLINE',
      timestamp: new Date().toISOString(),
      note: next
        ? 'Module 8 placed under maintenance for database & queue restructuring during safe 11 PM - 4 AM window.'
        : 'Module 8 maintenance complete. Online status restored.'
    });
  };

  // Scenario 5: Security Attack — Repeated Failed Login (Rule 1)
  const runRepeatedFailedLogin = async () => {
    setActiveRunningScenario('failed-logins');
    const userId = 'U001';
    const ip = '192.168.1.105';
    const sessionId = `S-FAIL-${Date.now().toString(36)}`;

    // 5 rapid failed attempts
    for (let i = 1; i <= 5; i++) {
      await dispatchEvent({
        event_id: `EV-FAIL-${Date.now()}-${i}`,
        user_id: userId,
        session_id: sessionId,
        event_type: 'login_failed',
        timestamp: new Date().toISOString(),
        ip,
        status: 'failed',
        metadata: { attempt: i, reason: 'Invalid password credentials' }
      });
      await delay(120);
    }

    // 1 successful login
    await dispatchEvent({
      event_id: `EV-SUCC-${Date.now()}`,
      user_id: userId,
      session_id: sessionId,
      event_type: 'login_success',
      timestamp: new Date().toISOString(),
      ip,
      status: 'success',
      metadata: { attempt: 6, note: 'Login succeeded after repeated failures' }
    });

    // Fire Rule 1 Alert
    dispatchAlert({
      alert_id: `ALT-R1-${Date.now()}`,
      rule_id: 'RULE_1',
      rule_name: 'Repeated Failed Login Attempts',
      severity: 'HIGH',
      user_id: userId,
      description: '5 consecutive failed authentication attempts within 2 minutes detected for user U001.',
      timestamp: new Date().toISOString()
    });

    setActiveRunningScenario(null);
  };

  // Scenario 6: Security Attack — Suspicious Login Sequence (Rule 4)
  const runSuspiciousAttackSequence = async () => {
    setActiveRunningScenario('attack-chain');
    const userId = 'U003';
    const untrustedIp = '203.0.113.88';
    const sessionId = `S-ATTACK-${Date.now().toString(36)}`;

    // Failed login
    await dispatchEvent({
      event_id: `EV-ATK1-${Date.now()}`,
      user_id: userId,
      session_id: sessionId,
      event_type: 'login_failed',
      timestamp: new Date().toISOString(),
      ip: untrustedIp,
      status: 'failed',
      metadata: { note: 'Probing login from uncataloged external IP' }
    });
    await delay(150);

    // Login success
    await dispatchEvent({
      event_id: `EV-ATK2-${Date.now()}`,
      user_id: userId,
      session_id: sessionId,
      event_type: 'login_success',
      timestamp: new Date().toISOString(),
      ip: untrustedIp,
      status: 'success',
      metadata: { note: 'External compromised session established' }
    });
    await delay(150);

    // Sensitive Resource Access: system_config.json
    await dispatchEvent({
      event_id: `EV-ATK3-${Date.now()}`,
      user_id: userId,
      session_id: sessionId,
      event_type: 'resource_access',
      timestamp: new Date().toISOString(),
      ip: untrustedIp,
      resource: 'system_config.json',
      status: 'success',
      security_flag: true,
      metadata: {
        classification: 'CRITICAL_SECRET',
        module_id: 'MOD-05',
        module_name: 'File Writing & Document Export'
      }
    });

    // Fire Rule 4 Alert
    dispatchAlert({
      alert_id: `ALT-R4-${Date.now()}`,
      rule_id: 'RULE_4',
      rule_name: 'Suspicious Activity Sequence (Attack Chain)',
      severity: 'CRITICAL',
      user_id: userId,
      description: 'Failed login followed by external authentication and immediate access to sensitive file system_config.json.',
      timestamp: new Date().toISOString()
    });

    setActiveRunningScenario(null);
  };

  // Scenario 7: Abnormal API Burst (Rule 5)
  const runAbnormalApiBurst = async () => {
    setActiveRunningScenario('api-burst');
    const userId = 'U004';
    const ip = '198.51.100.42';
    const sessionId = `S-BURST-${Date.now().toString(36)}`;

    for (let i = 1; i <= 20; i++) {
      await dispatchEvent({
        event_id: `EV-BURST-${Date.now()}-${i}`,
        user_id: userId,
        session_id: sessionId,
        event_type: 'api_request',
        timestamp: new Date().toISOString(),
        ip,
        resource: `/api/v1/records/batch_export_${i}`,
        status: 'success',
        metadata: { request_index: i, burst_window: '1.2s' }
      });
      await delay(40);
    }

    dispatchAlert({
      alert_id: `ALT-R5-${Date.now()}`,
      rule_id: 'RULE_5',
      rule_name: 'Abnormal API Activity Burst',
      severity: 'MEDIUM',
      user_id: userId,
      description: 'Traffic spike exceeding 20 API requests in 1.2 seconds detected for account U004.',
      timestamp: new Date().toISOString()
    });

    setActiveRunningScenario(null);
  };

  // Reset Environment
  const handleReset = () => {
    setLogs([]);
    broadcastTelemetry('system:reset', {});
    try {
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
    } catch (e) {}
  };

  return (
    <div className="simulation-panel-container">
      {/* Simulation Header */}
      <header className="sim-header">
        <div className="sim-brand">
          <div className="sim-badge">INTERACTIVE SIMULATION CONSOLE</div>
          <h1>System Telemetry &amp; Attack Scenario Simulator</h1>
          <p>
            Generates realistic enterprise module events, traffic curves, and adversary attacks.
            Synced in <strong>real time</strong> across browser tabs via live telemetry event streaming.
          </p>
        </div>

        <div className="sim-actions">
          <div className="sim-status-pill">
            <span className="sim-dot-pulse"></span>
            Real-Time Broadcast: ACTIVE
          </div>
          <button className="btn-dashboard-link" onClick={onNavigateToDashboard}>
            Open Live SOC Dashboard ↗
          </button>
        </div>
      </header>

      {/* Main Grid: Controls + Event Feed */}
      <div className="sim-grid">
        {/* Left Column: Controls */}
        <div className="sim-controls-col">
          {/* Section A: Module Usage & Maintenance Scenarios */}
          <div className="sim-card card">
            <div className="card-badge badge-blue">FEATURE &amp; DOWNTIME ANALYSIS</div>
            <h3>1. Platform Module Usage &amp; Downtime Simulations</h3>
            <p className="card-desc">
              Simulate traffic across the 9 modules (File Access, Writing, Voice Recording, Ephemeral Media, Status, Media Upload).
              Demonstrate that <strong>Module 8 (Media Upload)</strong> is inactive between 11 PM and 4 AM, making it safe for restructuring.
            </p>

            <div className="sim-buttons-stack">
              <button
                className={`sim-btn btn-highlight ${activeRunningScenario === 'night-lull' ? 'btn-running' : ''}`}
                onClick={runNightLullSimulation}
                disabled={!!activeRunningScenario}
              >
                <div className="btn-text-group">
                  <div className="btn-title">⭐ Simulate 11 PM – 4 AM Night Lull (MOD-08 Idle)</div>
                  <div className="btn-sub">Shows 0 uploads on Module 8; proves optimal downtime window for repairs</div>
                </div>
                <span>▶</span>
              </button>

              <button
                className={`sim-btn btn-primary ${activeRunningScenario === 'day-peak' ? 'btn-running' : ''}`}
                onClick={runDaytimePeakSimulation}
                disabled={!!activeRunningScenario}
              >
                <div className="btn-text-group">
                  <div className="btn-title">Simulate Daytime Concurrency Peak</div>
                  <div className="btn-sub">Spike traffic across MOD-02 (Chat) &amp; MOD-07 (Status Broadcast)</div>
                </div>
                <span>▶</span>
              </button>

              <div className="sub-section-title">Individual User-to-Module Actions:</div>
              <div className="sim-btn-grid">
                <button
                  className="sim-btn-sm"
                  onClick={() => runUserModuleAction('U001', 'MOD-05', 'Writing ledger update', 'system_config.json')}
                >
                  U001 → File Writing (MOD-05)
                </button>
                <button
                  className="sim-btn-sm"
                  onClick={() => runUserModuleAction('U003', 'MOD-03', 'Recording voice briefing', 'audio_memo.opus')}
                >
                  U003 → Voice Recording (MOD-03)
                </button>
                <button
                  className="sim-btn-sm"
                  onClick={() => runUserModuleAction('U004', 'MOD-06', 'Decrypting view-once image', 'ephemeral_vault.dat')}
                >
                  U004 → View-Once (MOD-06)
                </button>
                <button
                  className="sim-btn-sm"
                  onClick={() => runUserModuleAction('U005', 'MOD-08', 'Uploading 4K video chunk', 'media_chunk_01.mp4')}
                >
                  U005 → Media Upload (MOD-08)
                </button>
              </div>

              <div className="sub-section-title">Module 8 Maintenance Switch:</div>
              <button
                className={`sim-btn ${mod8DowntimeActive ? 'btn-warn' : 'btn-purple'}`}
                onClick={toggleMod8Maintenance}
              >
                <div className="btn-text-group">
                  <div className="btn-title">
                    {mod8DowntimeActive ? 'Restore Module 8 Online (End Downtime)' : '⚙️ Place Module 8 in Downtime / Restructure Mode'}
                  </div>
                  <div className="btn-sub">
                    {mod8DowntimeActive ? 'Completes restructuring and sets status back to online' : 'Simulates structural database & worker upgrades during 11 PM - 4 AM window'}
                  </div>
                </div>
                <span>{mod8DowntimeActive ? '✓' : '⚙️'}</span>
              </button>
            </div>
          </div>

          {/* Section B: Security Attack Scenarios */}
          <div className="sim-card card">
            <div className="card-badge badge-red">DETERMINISTIC THREAT SCENARIOS</div>
            <h3>2. Security Attack &amp; Anomaly Detection Triggers</h3>
            <p className="card-desc">
              Trigger realistic adversary sequences to test the Security Rule Engine and D3 correlation graph.
            </p>

            <div className="sim-buttons-stack">
              <button
                className={`sim-btn btn-danger ${activeRunningScenario === 'attack-chain' ? 'btn-running' : ''}`}
                onClick={runSuspiciousAttackSequence}
                disabled={!!activeRunningScenario}
              >
                <div className="btn-text-group">
                  <div className="btn-title">Simulate Suspicious Attack Chain (Rule 4 · CRITICAL)</div>
                  <div className="btn-sub">U003 — Failed logins → Success from external IP → Access system_config.json</div>
                </div>
                <span>▶</span>
              </button>

              <button
                className={`sim-btn btn-warn ${activeRunningScenario === 'failed-logins' ? 'btn-running' : ''}`}
                onClick={runRepeatedFailedLogin}
                disabled={!!activeRunningScenario}
              >
                <div className="btn-text-group">
                  <div className="btn-title">Simulate Repeated Failed Logins (Rule 1 · HIGH)</div>
                  <div className="btn-sub">U001 — 5 consecutive failed logins within 2 minutes</div>
                </div>
                <span>▶</span>
              </button>

              <button
                className={`sim-btn btn-blue ${activeRunningScenario === 'api-burst' ? 'btn-running' : ''}`}
                onClick={runAbnormalApiBurst}
                disabled={!!activeRunningScenario}
              >
                <div className="btn-text-group">
                  <div className="btn-title">Simulate Abnormal API Traffic Burst (Rule 5 · MEDIUM)</div>
                  <div className="btn-sub">U004 — High-frequency traffic spike of 20 requests in 1.2s</div>
                </div>
                <span>▶</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Emitted Telemetry Stream */}
        <div className="sim-feed-col card">
          <div className="feed-header">
            <div>
              <h3>Real-Time Emitted Telemetry Feed</h3>
              <p className="desc">Direct feed of normalized JSON events shipped across the platform.</p>
            </div>
            <div className="feed-actions">
              <span className="log-counter">{logs.length} dispatched</span>
              <button className="btn-reset-clean" onClick={handleReset}>
                Reset All Baseline
              </button>
            </div>
          </div>

          <div className="sim-log-terminal">
            {logs.length === 0 ? (
              <div className="empty-terminal">
                <span className="term-icon">📡</span>
                <p>Waiting for scenario execution...</p>
                <span className="term-hint">Click any simulation button on the left to fire live events.</span>
              </div>
            ) : (
              logs.map((item) => (
                <div key={item.id} className={`term-entry entry-${item.status}`}>
                  <div className="entry-meta">
                    <span className="entry-time">{item.time}</span>
                    <span className="entry-user">{item.user}</span>
                    <span className={`entry-type ${item.type.includes('ALERT') ? 'entry-alert' : ''}`}>
                      {item.type}
                    </span>
                  </div>
                  <div className="entry-body">
                    <span className="entry-res">{item.resource}</span>
                    <span className={`entry-status status-${item.status}`}>{item.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
