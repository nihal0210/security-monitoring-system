import React, { useState, useMemo } from 'react';
import { ENTERPRISE_MODULES, DEMO_USERS_MODULE_STATE, HOURS_LABELS } from '../data/modulesData';
import { broadcastTelemetry } from '../services/eventBus';

export default function ModuleUsageAnalytics({ liveEvents = [], onNavigateToThreatOps, onOpenSimulator }) {
  const [selectedModuleId, setSelectedModuleId] = useState('ALL');
  const [userStates, setUserStates] = useState(DEMO_USERS_MODULE_STATE);
  const [moduleMaintenanceStates, setModuleMaintenanceStates] = useState({
    'MOD-08': 'SAFE_SCHEDULED' // MOD-08 starts ready for scheduled maintenance
  });
  const [activeModalModule, setActiveModalModule] = useState(null);
  const [maintenanceSuccessBanner, setMaintenanceSuccessBanner] = useState(null);

  // Compute live module traffic counts by combining baseline + any live events
  const moduleTraffic = useMemo(() => {
    const counts = {};
    ENTERPRISE_MODULES.forEach(m => {
      const baseSum = m.baseHourly.reduce((a, b) => a + b, 0);
      // count live events that match this module
      const liveCount = liveEvents.filter(e => {
        const metaMod = e.metadata?.module_id || e.raw_metadata?.module_id;
        const res = e.resource || '';
        if (metaMod === m.id) return true;
        if (m.id === 'MOD-04' && (res.includes('.pdf') || res.includes('.csv'))) return true;
        if (m.id === 'MOD-05' && (res.includes('.xlsx') || res.includes('.json'))) return true;
        if (m.id === 'MOD-08' && res.includes('media_chunk')) return true;
        return false;
      }).length;
      counts[m.id] = baseSum + liveCount * 12;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const shares = {};
    Object.keys(counts).forEach(id => {
      shares[id] = ((counts[id] / total) * 100).toFixed(1);
    });

    return { counts, total, shares };
  }, [liveEvents]);

  // Hourly curve data for the selected module (or combined)
  const hourlyData = useMemo(() => {
    if (selectedModuleId === 'ALL') {
      const combined = new Array(24).fill(0);
      ENTERPRISE_MODULES.forEach(m => {
        m.baseHourly.forEach((val, idx) => {
          combined[idx] += val;
        });
      });
      const maxVal = Math.max(...combined);
      return combined.map((val, hour) => ({
        hour,
        label: HOURS_LABELS[hour],
        val,
        heightPct: maxVal > 0 ? (val / maxVal) * 100 : 0,
        isNightWindow: hour >= 23 || hour <= 4 // 11 PM to 4 AM
      }));
    } else {
      const target = ENTERPRISE_MODULES.find(m => m.id === selectedModuleId);
      if (!target) return [];
      const maxVal = Math.max(...target.baseHourly);
      return target.baseHourly.map((val, hour) => ({
        hour,
        label: HOURS_LABELS[hour],
        val,
        heightPct: maxVal > 0 ? (val / maxVal) * 100 : 0,
        isNightWindow: hour >= 23 || hour <= 4
      }));
    }
  }, [selectedModuleId]);

  // Handle scheduling or executing maintenance on a module
  const handleInitiateMaintenance = (module) => {
    setActiveModalModule(module);
  };

  const handleConfirmMaintenance = (moduleId) => {
    const isUnder = moduleMaintenanceStates[moduleId] === 'ACTIVE_DOWNTIME';
    const nextState = isUnder ? 'ONLINE' : 'ACTIVE_DOWNTIME';

    setModuleMaintenanceStates(prev => ({
      ...prev,
      [moduleId]: nextState
    }));

    const mod = ENTERPRISE_MODULES.find(m => m.id === moduleId);
    const msg = nextState === 'ACTIVE_DOWNTIME'
      ? `Module ${moduleId} (${mod?.name}) is now in DOWNTIME / MAINTENANCE mode. Restructuring in progress safely without user disruption.`
      : `Module ${moduleId} (${mod?.name}) maintenance completed. Service restored online with updated schemas.`;

    setMaintenanceSuccessBanner(msg);
    setActiveModalModule(null);

    // Broadcast over cross-tab telemetry channel
    broadcastTelemetry('module:maintenance_toggle', {
      moduleId,
      moduleName: mod?.name,
      status: nextState,
      timestamp: new Date().toISOString()
    });

    setTimeout(() => {
      setMaintenanceSuccessBanner(null);
    }, 6000);
  };

  // Quick simulation helpers to change user activity
  const simulateUserAction = (userId, moduleId, actionDesc, resourceName) => {
    const mod = ENTERPRISE_MODULES.find(m => m.id === moduleId);
    setUserStates(prev => prev.map(u => {
      if (u.userId === userId) {
        const isConflict = moduleMaintenanceStates[moduleId] === 'ACTIVE_DOWNTIME';
        return {
          ...u,
          currentModuleId: moduleId,
          currentAction: actionDesc,
          lastActive: 'Just now',
          maintenanceConflict: isConflict
        };
      }
      return u;
    }));

    // Broadcast telemetry event
    broadcastTelemetry('event:new', {
      event_id: `EV-MOD-${Date.now()}`,
      user_id: userId,
      session_id: `S-${Date.now().toString(36)}`,
      event_type: 'module_interaction',
      timestamp: new Date().toISOString(),
      ip: '192.168.1.' + Math.floor(Math.random() * 80 + 10),
      resource: resourceName || `${mod?.code || 'feature'}.dat`,
      status: 'success',
      metadata: {
        module_id: moduleId,
        module_name: mod?.name,
        action: actionDesc
      }
    });
  };

  return (
    <div className="module-analytics-view">
      {/* Top Banner if maintenance is active */}
      {maintenanceSuccessBanner && (
        <div className="module-alert-banner alert-success">
          <span className="banner-icon">⚙️</span>
          <span>{maintenanceSuccessBanner}</span>
          <button className="banner-close" onClick={() => setMaintenanceSuccessBanner(null)}>×</button>
        </div>
      )}

      {/* Header and Page Navigation */}
      <div className="module-view-header">
        <div className="header-titles">
          <div className="header-badge">ENTERPRISE SYSTEM TELEMETRY</div>
          <h2>Module Usage &amp; Downtime Maintenance Window Optimizer</h2>
          <p>
            Track functional module usage across users (File Access, File Writing, Voice Recording, Ephemeral Media, Status Broadcast, Media Upload)
            to identify low-traffic periods and schedule architectural restructuring without business downtime.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn-secondary" onClick={onNavigateToThreatOps}>
            ← SOC Threat Graph
          </button>
          <button className="btn-primary-action" onClick={onOpenSimulator}>
            ⚡ Launch Simulation Deck
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="module-kpi-grid">
        <div className="module-kpi-card">
          <div className="kpi-label">Monitored Platform Modules</div>
          <div className="kpi-val">9 <span className="kpi-sub">Services Active</span></div>
          <div className="kpi-desc">Decoupled functional components across all client platforms</div>
        </div>

        <div className="module-kpi-card">
          <div className="kpi-label">Highest Traffic Module</div>
          <div className="kpi-val text-accent">
            MOD-02 <span className="kpi-sub">Direct Chat ({moduleTraffic.shares['MOD-02'] || '29.5'}%)</span>
          </div>
          <div className="kpi-desc">High concurrency peak: 12:00 PM – 02:00 PM &amp; 06:00 PM – 10:00 PM</div>
        </div>

        <div className="module-kpi-card highlight-card">
          <div className="kpi-label">Lowest Nightly Traffic Module</div>
          <div className="kpi-val text-success">
            MOD-08 <span className="kpi-sub">Media Upload ({moduleTraffic.shares['MOD-08'] || '4.1'}%)</span>
          </div>
          <div className="kpi-desc">
            <strong>Optimal Downtime Target</strong>: 11:00 PM – 04:00 AM (&lt; 0.2% traffic)
          </div>
        </div>

        <div className="module-kpi-card">
          <div className="kpi-label">Calculated Global Maintenance Window</div>
          <div className="kpi-val text-purple">
            11:00 PM – 04:00 AM <span className="kpi-sub">(5h Window)</span>
          </div>
          <div className="kpi-desc">Negligible user impact window for database schemas &amp; structural repairs</div>
        </div>
      </div>

      {/* 24-Hour Temporal Activity Chart */}
      <div className="temporal-chart-panel card">
        <div className="chart-header">
          <div>
            <h3>24-Hour Temporal Module Activity Distribution</h3>
            <p className="desc">
              Hourly request density across a 24-hour cycle. The shaded green section represents the
              <strong> 11:00 PM – 04:00 AM Night Maintenance Window</strong> where heavy background pipelines like
              <strong> MOD-08 (High-Res Media Upload)</strong> drop to near zero activity.
            </p>
          </div>

          <div className="chart-filter">
            <label>Filter Module:</label>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="module-select"
            >
              <option value="ALL">All Modules Combined</option>
              {ENTERPRISE_MODULES.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id}: {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 24-Hour Bar Graph */}
        <div className="chart-canvas">
          <div className="chart-maintenance-overlay">
            <div className="maintenance-zone-left" title="Safe Night Window (12 AM - 4 AM)">
              <span className="zone-tag">SAFE DOWNTIME ZONE</span>
            </div>
            <div className="maintenance-zone-mid"></div>
            <div className="maintenance-zone-right" title="Safe Night Window (11 PM - 12 AM)">
              <span className="zone-tag">11 PM</span>
            </div>
          </div>

          <div className="bars-container">
            {hourlyData.map((d) => (
              <div key={d.hour} className={`bar-col ${d.isNightWindow ? 'night-window' : ''}`}>
                <div className="bar-wrapper" title={`${d.label}: ${d.val} requests (${d.isNightWindow ? 'Low Traffic Window' : 'Day Concurrency'})`}>
                  <div
                    className={`bar-fill ${d.isNightWindow ? 'fill-safe' : 'fill-active'} ${selectedModuleId === 'MOD-08' ? 'fill-mod8' : ''}`}
                    style={{ height: `${Math.max(d.heightPct, 4)}%` }}
                  />
                </div>
                <div className="bar-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-box box-safe"></span>
            <span>Optimal Low-Traffic Window (11:00 PM – 04:00 AM) — <strong>Safe for Downtime &amp; Upgrades</strong></span>
          </div>
          <div className="legend-item">
            <span className="legend-box box-active"></span>
            <span>Active Peak Concurrency Hours (Avoid System Interruptions)</span>
          </div>
          {selectedModuleId === 'MOD-08' && (
            <div className="legend-item highlight-legend">
              <span className="legend-box box-mod8"></span>
              <span><strong>MOD-08 Curve</strong>: Zero active uploads between 11 PM and 4 AM</span>
            </div>
          )}
        </div>
      </div>

      {/* The 9 Modules Directory & Maintenance Window Calculator */}
      <div className="modules-directory card">
        <div className="directory-header">
          <div>
            <h3>The 9 Monitored Platform Functional Modules</h3>
            <p className="desc">
              Comprehensive analysis of system features, hourly usage profiles, and computed safe maintenance windows.
            </p>
          </div>
        </div>

        <div className="modules-table-container">
          <table className="module-table">
            <thead>
              <tr>
                <th>Module ID &amp; Feature Name</th>
                <th>Category</th>
                <th>Traffic Share</th>
                <th>Peak Hours</th>
                <th>Optimal Maintenance Window</th>
                <th>Downtime Impact Risk</th>
                <th>Status &amp; Action</th>
              </tr>
            </thead>
            <tbody>
              {ENTERPRISE_MODULES.map(m => {
                const currentStatus = moduleMaintenanceStates[m.id] || 'ONLINE';
                const isUnderMaintenance = currentStatus === 'ACTIVE_DOWNTIME';
                const isMod8 = m.id === 'MOD-08';

                return (
                  <tr key={m.id} className={`${isMod8 ? 'mod8-highlight-row' : ''} ${isUnderMaintenance ? 'row-in-maintenance' : ''}`}>
                    <td>
                      <div className="mod-info">
                        <span className="mod-code-badge">{m.id}</span>
                        <div>
                          <div className="mod-name">{m.name}</div>
                          <div className="mod-desc">{m.description}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-pill">{m.category}</span>
                    </td>
                    <td>
                      <div className="traffic-cell">
                        <span className="traffic-val">{moduleTraffic.shares[m.id] || m.typicalShare}%</span>
                        <div className="mini-progress">
                          <div
                            className="mini-bar"
                            style={{ width: `${Math.min(100, (moduleTraffic.shares[m.id] || m.typicalShare) * 3)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-muted">{m.peakWindow}</td>
                    <td>
                      <div className="maintenance-target">
                        <span className="window-pill">{m.maintenanceWindow.label}</span>
                        <div className="window-note">{m.maintenanceWindow.recommendation}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`impact-badge impact-${m.maintenanceWindow.impactRisk.toLowerCase().replace(/[^a-z]/g, '')}`}>
                        {m.maintenanceWindow.impactRisk}
                      </span>
                    </td>
                    <td>
                      <div className="action-cell">
                        {isUnderMaintenance ? (
                          <div className="maintenance-action-group">
                            <span className="status-badge-under">Under Repair</span>
                            <button
                              className="btn-sm btn-restore"
                              onClick={() => handleConfirmMaintenance(m.id)}
                            >
                              Restore Online
                            </button>
                          </div>
                        ) : (
                          <button
                            className={`btn-sm ${isMod8 ? 'btn-mod8-action' : 'btn-schedule'}`}
                            onClick={() => handleInitiateMaintenance(m)}
                          >
                            {isMod8 ? '⭐ Restructure MOD-08' : 'Schedule Downtime'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live User-to-Module Mapping Table */}
      <div className="user-module-matrix card">
        <div className="matrix-header">
          <div>
            <h3>Real-Time User Activity Tracking by Module</h3>
            <p className="desc">
              Live tracking showing which of the 5 enterprise users is currently interacting with which module,
              ensuring administrators do not take a module down while active sessions are writing to it.
            </p>
          </div>
          <div className="matrix-quick-triggers">
            <span className="quick-label">Simulate User Traffic:</span>
            <button
              className="quick-btn"
              onClick={() => simulateUserAction('U001', 'MOD-05', 'Writing quarterly ledger schema', 'system_config.json')}
            >
              U001 → File Writing (MOD-05)
            </button>
            <button
              className="quick-btn"
              onClick={() => simulateUserAction('U003', 'MOD-03', 'Recording executive voice memo', 'voice_briefing.opus')}
            >
              U003 → Voice Rec (MOD-03)
            </button>
            <button
              className="quick-btn"
              onClick={() => simulateUserAction('U004', 'MOD-06', 'Viewing ephemeral secure document', 'confidential_view_once.dat')}
            >
              U004 → View-Once (MOD-06)
            </button>
            <button
              className="quick-btn btn-highlight"
              onClick={() => simulateUserAction('U005', 'MOD-08', 'Initiating video transcode chunk', 'media_chunk_01.mp4')}
            >
              U005 → Media Upload (MOD-08)
            </button>
          </div>
        </div>

        <div className="user-table-wrapper">
          <table className="user-matrix-table">
            <thead>
              <tr>
                <th>User ID &amp; Name</th>
                <th>Department &amp; Role</th>
                <th>Current Active Module</th>
                <th>Current In-Flight Operation</th>
                <th>Session IP</th>
                <th>Last Active</th>
                <th>Downtime Conflict Status</th>
              </tr>
            </thead>
            <tbody>
              {userStates.map(u => {
                const mod = ENTERPRISE_MODULES.find(m => m.id === u.currentModuleId);
                const isUnderMaintenance = moduleMaintenanceStates[u.currentModuleId] === 'ACTIVE_DOWNTIME';

                return (
                  <tr key={u.userId} className={isUnderMaintenance ? 'conflict-row' : ''}>
                    <td>
                      <div className="user-name-col">
                        <span className="user-avatar">{u.userId}</span>
                        <div>
                          <div className="user-name-text">{u.name}</div>
                          <div className="user-id-sub">{u.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dept-text">{u.dept}</div>
                      <div className="role-sub">{u.role}</div>
                    </td>
                    <td>
                      <div className="active-module-pill">
                        <span className="pill-code">{mod?.id || u.currentModuleId}</span>
                        <span className="pill-name">{mod?.name || 'Active Service'}</span>
                      </div>
                    </td>
                    <td className="action-text">{u.currentAction}</td>
                    <td className="font-mono text-muted">{u.ip}</td>
                    <td className="text-muted">{u.lastActive}</td>
                    <td>
                      {isUnderMaintenance ? (
                        <span className="conflict-badge danger">
                          ⚠️ Active on Down Module!
                        </span>
                      ) : (
                        <span className="conflict-badge safe">
                          ✓ Safe / No Conflict
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Confirmation Modal */}
      {activeModalModule && (
        <div className="maintenance-modal-backdrop" onClick={() => setActiveModalModule(null)}>
          <div className="maintenance-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-code">{activeModalModule.id}</span>
                <h3>Initiate Maintenance &amp; Structural Repair</h3>
              </div>
              <button className="btn-close" onClick={() => setActiveModalModule(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="modal-module-banner">
                <h4>{activeModalModule.name}</h4>
                <p>{activeModalModule.description}</p>
              </div>

              <div className="analysis-summary-box">
                <div className="summary-row">
                  <span className="summary-label">Recommended Maintenance Window:</span>
                  <span className="summary-value text-accent font-mono">{activeModalModule.maintenanceWindow.label}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Downtime Traffic Impact:</span>
                  <span className="summary-value text-success font-mono">{activeModalModule.maintenanceWindow.avgTrafficShare}% of 24h Traffic</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Impact Risk Rating:</span>
                  <span className={`impact-badge impact-${activeModalModule.maintenanceWindow.impactRisk.toLowerCase().replace(/[^a-z]/g, '')}`}>
                    {activeModalModule.maintenanceWindow.impactRisk}
                  </span>
                </div>
              </div>

              {activeModalModule.id === 'MOD-08' ? (
                <div className="modal-callout callout-success">
                  <strong>⭐ Verified Safe Restructuring Window:</strong>
                  <p>
                    Module 8 (High-Res Media Upload &amp; Transcoding) experiences virtually zero consumer uploads between
                    <strong> 11:00 PM and 04:00 AM</strong>. Taking this module offline during this window allows queue refactoring,
                    database schema migrations, and FFmpeg transcoding worker upgrades with <strong>0% business disruption</strong>.
                  </p>
                </div>
              ) : (
                <div className="modal-callout callout-info">
                  <strong>Pre-Flight Maintenance Notice:</strong>
                  <p>
                    Taking this module down will route requests to temporary fallback handlers.
                    Ensure the maintenance window is adhered to minimize active user disruption.
                  </p>
                </div>
              )}

              <div className="preflight-checklist">
                <div className="checklist-title">Pre-Flight Safety Checks:</div>
                <label className="checklist-item">
                  <input type="checkbox" defaultChecked disabled />
                  <span>Drain pending async worker queues</span>
                </label>
                <label className="checklist-item">
                  <input type="checkbox" defaultChecked disabled />
                  <span>Check active user sessions (0 active uploads in night window)</span>
                </label>
                <label className="checklist-item">
                  <input type="checkbox" defaultChecked disabled />
                  <span>Enable rollback checkpoint &amp; backup database replica</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setActiveModalModule(null)}>
                Cancel
              </button>
              <button
                className="btn-confirm-downtime"
                onClick={() => handleConfirmMaintenance(activeModalModule.id)}
              >
                Confirm &amp; Place Under Maintenance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
