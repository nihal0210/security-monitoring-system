import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import OverviewStats from './components/OverviewStats';
import TemporalGraph from './components/TemporalGraph';
import HistoricalSlider from './components/HistoricalSlider';
import UserList from './components/UserList';
import UserDetailDrawer from './components/UserDetailDrawer';
import SecurityAlerts from './components/SecurityAlerts';
import EventLogViewer from './components/EventLogViewer';
import ModuleUsageAnalytics from './components/ModuleUsageAnalytics';
import SimulationPanel from './components/SimulationPanel';
import { useWebSocket } from './hooks/useWebSocket';
import { subscribeTelemetry } from './services/eventBus';
import {
  fetchStats,
  fetchUsers,
  fetchAlerts,
  fetchHierarchicalGraph,
  fetchEvents,
  fetchHistoricalState,
  resetDemoEnvironment
} from './services/api';

// Baseline demo users matching UserList schema
const INITIAL_USERS = [
  { user_id: 'U001', name: 'Rahul Sharma', department: 'Engineering', role: 'Lead Architect', status: 'normal', risk_score: 10, failed_login_count: 0, last_event_time: new Date().toISOString() },
  { user_id: 'U002', name: 'Amit Patel', department: 'Finance', role: 'Financial Analyst', status: 'normal', risk_score: 5, failed_login_count: 0, last_event_time: new Date().toISOString() },
  { user_id: 'U003', name: 'Priya Singh', department: 'Human Resources', role: 'HR Manager', status: 'normal', risk_score: 8, failed_login_count: 0, last_event_time: new Date().toISOString() },
  { user_id: 'U004', name: 'Neha Gupta', department: 'Sales', role: 'Account Executive', status: 'normal', risk_score: 5, failed_login_count: 0, last_event_time: new Date().toISOString() },
  { user_id: 'U005', name: 'Rohan Verma', department: 'Marketing', role: 'Growth Lead', status: 'normal', risk_score: 5, failed_login_count: 0, last_event_time: new Date().toISOString() }
];

// Baseline hierarchy matching TemporalGraph D3 schema: { server, users: [...], alerts: [...] }
const INITIAL_HIERARCHY = {
  server: {
    name: 'CENTRAL_SERVER',
    status: 'ONLINE',
    suspicious_count: 0
  },
  users: [
    {
      user_id: 'U001',
      name: 'Rahul Sharma',
      department: 'Engineering',
      role: 'Lead Architect',
      status: 'normal',
      has_alerts: false,
      max_alert_severity: null,
      event_count: 1,
      events: [
        { event_id: 'EV-INIT-1', event_type: 'login_success', timestamp: new Date().toISOString(), resource: 'Authentication Gateway', status: 'success', is_suspicious: false }
      ]
    },
    {
      user_id: 'U002',
      name: 'Amit Patel',
      department: 'Finance',
      role: 'Financial Analyst',
      status: 'normal',
      has_alerts: false,
      max_alert_severity: null,
      event_count: 1,
      events: [
        { event_id: 'EV-INIT-2', event_type: 'resource_access', timestamp: new Date().toISOString(), resource: 'finance_q3.xlsx', status: 'success', is_suspicious: false }
      ]
    },
    {
      user_id: 'U003',
      name: 'Priya Singh',
      department: 'Human Resources',
      role: 'HR Manager',
      status: 'normal',
      has_alerts: false,
      max_alert_severity: null,
      event_count: 1,
      events: [
        { event_id: 'EV-INIT-3', event_type: 'resource_access', timestamp: new Date().toISOString(), resource: 'policy_briefing.pdf', status: 'success', is_suspicious: false }
      ]
    },
    {
      user_id: 'U004',
      name: 'Neha Gupta',
      department: 'Sales',
      role: 'Account Executive',
      status: 'normal',
      has_alerts: false,
      max_alert_severity: null,
      event_count: 1,
      events: [
        { event_id: 'EV-INIT-4', event_type: 'api_request', timestamp: new Date().toISOString(), resource: '/api/v1/clients', status: 'success', is_suspicious: false }
      ]
    },
    {
      user_id: 'U005',
      name: 'Rohan Verma',
      department: 'Marketing',
      role: 'Growth Lead',
      status: 'normal',
      has_alerts: false,
      max_alert_severity: null,
      event_count: 1,
      events: [
        { event_id: 'EV-INIT-5', event_type: 'resource_access', timestamp: new Date().toISOString(), resource: 'campaign_assets.png', status: 'success', is_suspicious: false }
      ]
    }
  ],
  alerts: []
};

// Baseline stats matching OverviewStats schema
const INITIAL_STATS = {
  server_status: 'ONLINE',
  total_users: 5,
  active_users: 5,
  active_sessions: 5,
  events_per_minute: 8,
  total_events: 5,
  security_alerts_total: 0,
  alerts_by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
};

export default function App() {
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('simulator')) return 'simulator';
      if (hash.includes('modules')) return 'modules';
    }
    return 'threat-ops';
  };

  const [currentView, setCurrentView] = useState(getInitialView);

  // Core state
  const [stats, setStats] = useState(INITIAL_STATS);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);

  // Hierarchical graph data (for D3 tree)
  const [hierarchyData, setHierarchyData] = useState(INITIAL_HIERARCHY);

  // Live vs Historical mode
  const [isLive, setIsLive] = useState(true);
  const [historicalTimestamp, setHistoricalTimestamp] = useState(null);
  const [earliestEventTime, setEarliestEventTime] = useState(null);

  // Active tab in right panel
  const [activeTab, setActiveTab] = useState('alerts');

  // Selected user for investigation drawer
  const [investigatingUserId, setInvestigatingUserId] = useState(null);

  // Listen to hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('simulator')) setCurrentView('simulator');
      else if (hash.includes('modules')) setCurrentView('modules');
      else if (hash.includes('threat') || hash.includes('dashboard')) setCurrentView('threat-ops');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectView = (view) => {
    setCurrentView(view);
    if (view === 'simulator') window.location.hash = '#simulator';
    else if (view === 'modules') window.location.hash = '#modules';
    else window.location.hash = '#threat-ops';
  };

  // ── Initial Data Load with Backend Sync ────────────────────────
  const loadInitialData = useCallback(async () => {
    try {
      const [s, u, a, h, evs] = await Promise.all([
        fetchStats().catch(() => null),
        fetchUsers().catch(() => null),
        fetchAlerts().catch(() => null),
        fetchHierarchicalGraph().catch(() => null),
        fetchEvents({ limit: 100 }).catch(() => null)
      ]);

      if (s) {
        setStats(s);
      }
      if (u && Array.isArray(u) && u.length > 0) {
        setUsers(u);
      }
      if (a && Array.isArray(a)) {
        setAlerts(a);
      }
      if (h && h.users && h.users.length > 0) {
        setHierarchyData(h);
      }
      if (evs && Array.isArray(evs) && evs.length > 0) {
        setEvents(evs);
        setEarliestEventTime(evs[evs.length - 1].timestamp);
      }
    } catch (err) {
      console.warn('[App] Local fallback state active', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Unified Telemetry Inbound Handler ──────────────────────────
  const handleInboundEvent = useCallback((payload) => {
    const { type, data } = payload;

    if (type === 'event:new') {
      const newEvent = data;
      setEvents(prev => [newEvent, ...prev.slice(0, 99)]);
      setEarliestEventTime(prev => prev || newEvent.timestamp);

      // 1. Update Stats
      setStats(prev => {
        const cur = prev || INITIAL_STATS;
        return {
          ...cur,
          total_events: (cur.total_events || 0) + 1,
          events_per_minute: Math.min(50, (cur.events_per_minute || 8) + 1),
          active_users: 5
        };
      });

      // 2. Update Users List
      setUsers(prev => {
        const list = prev && prev.length > 0 ? prev : INITIAL_USERS;
        return list.map(u => {
          if (u.user_id === newEvent.user_id) {
            const isFailed = newEvent.event_type === 'login_failed';
            return {
              ...u,
              failed_login_count: (u.failed_login_count || 0) + (isFailed ? 1 : 0),
              risk_score: isFailed ? Math.min(100, (u.risk_score || 0) + 15) : u.risk_score,
              last_event_time: newEvent.timestamp
            };
          }
          return u;
        });
      });

      // 3. Update D3 Hierarchy Graph in-memory
      setHierarchyData(prev => {
        const currentHierarchy = prev?.users ? prev : INITIAL_HIERARCHY;
        const targetUserId = newEvent.user_id || 'U001';

        const updatedUsers = currentHierarchy.users.map(u => {
          if (u.user_id === targetUserId) {
            const isSuspicious = newEvent.status === 'failed' || newEvent.security_flag;
            const newEvItem = {
              event_id: newEvent.event_id || `EV-${Date.now()}`,
              event_type: newEvent.event_type || 'event',
              timestamp: newEvent.timestamp || new Date().toISOString(),
              resource: newEvent.resource || newEvent.metadata?.module_name || 'Event Resource',
              status: newEvent.status || 'success',
              is_suspicious: isSuspicious
            };

            const existingEvents = u.events || [];
            const nextEvents = [newEvItem, ...existingEvents.slice(0, 24)];

            return {
              ...u,
              event_count: nextEvents.length,
              events: nextEvents,
              status: isSuspicious ? 'suspicious' : u.status
            };
          }
          return u;
        });

        const suspiciousCount = updatedUsers.filter(u => u.status === 'suspicious').length;

        return {
          ...currentHierarchy,
          server: {
            ...currentHierarchy.server,
            suspicious_count: suspiciousCount
          },
          users: updatedUsers
        };
      });

      // Also attempt backend refresh if server is running
      fetchStats().then(setStats).catch(() => {});
      fetchUsers().then(setUsers).catch(() => {});
      setTimeout(() => {
        fetchHierarchicalGraph().then(setHierarchyData).catch(() => {});
      }, 350);

    } else if (type === 'event:alert') {
      const alertData = data;
      setAlerts(prev => [alertData, ...prev]);
      setActiveTab('alerts');

      // 1. Update Stats
      const sev = alertData.severity || 'HIGH';
      setStats(prev => {
        const cur = prev || INITIAL_STATS;
        const curSev = cur.alerts_by_severity || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        return {
          ...cur,
          security_alerts_total: (cur.security_alerts_total || 0) + 1,
          alerts_by_severity: {
            ...curSev,
            [sev]: (curSev[sev] || 0) + 1
          }
        };
      });

      // 2. Update Users List
      setUsers(prev => {
        const list = prev && prev.length > 0 ? prev : INITIAL_USERS;
        return list.map(u => {
          if (u.user_id === alertData.user_id) {
            return {
              ...u,
              status: 'suspicious',
              risk_score: Math.max(u.risk_score || 0, sev === 'CRITICAL' ? 95 : 80)
            };
          }
          return u;
        });
      });

      // 3. Update D3 Hierarchy Graph
      setHierarchyData(prev => {
        const currentHierarchy = prev?.users ? prev : INITIAL_HIERARCHY;
        const targetUserId = alertData.user_id;

        const updatedUsers = currentHierarchy.users.map(u => {
          if (u.user_id === targetUserId) {
            return {
              ...u,
              status: 'suspicious',
              has_alerts: true,
              max_alert_severity: sev
            };
          }
          return u;
        });

        const suspiciousCount = updatedUsers.filter(u => u.status === 'suspicious').length;

        return {
          ...currentHierarchy,
          server: {
            ...currentHierarchy.server,
            suspicious_count: suspiciousCount
          },
          users: updatedUsers,
          alerts: [alertData, ...(currentHierarchy.alerts || [])]
        };
      });

      fetchStats().then(setStats).catch(() => {});
      fetchUsers().then(setUsers).catch(() => {});
      setTimeout(() => {
        fetchHierarchicalGraph().then(setHierarchyData).catch(() => {});
      }, 400);

    } else if (type === 'system:reset') {
      setAlerts([]);
      setEvents([]);
      setUsers(INITIAL_USERS);
      setHierarchyData(INITIAL_HIERARCHY);
      setStats(INITIAL_STATS);
      loadInitialData();
    }
  }, [loadInitialData]);

  // WebSocket for backend dev server
  const { isConnected } = useWebSocket({ onMessage: handleInboundEvent });

  // Cross-Tab BroadcastChannel & LocalStorage subscriber
  useEffect(() => {
    const unsubscribe = subscribeTelemetry((msg) => {
      handleInboundEvent(msg);
    });
    return () => unsubscribe();
  }, [handleInboundEvent]);

  // ── Historical Scrub ─────────────────────────────────────────
  const handleScrub = async (targetDate) => {
    setIsLive(false);
    const iso = targetDate.toISOString();
    setHistoricalTimestamp(iso);

    try {
      const [historical, hierarchical] = await Promise.all([
        fetchHistoricalState(targetDate).catch(() => null),
        fetchHierarchicalGraph(iso).catch(() => null)
      ]);
      if (historical) {
        setUsers(historical.active_users || []);
        setAlerts(historical.active_alerts || []);
        setEvents(historical.recent_events || []);
      }
      if (hierarchical) {
        setHierarchyData(hierarchical);
      }
    } catch (err) {
      console.error('[App] Historical reconstruction error:', err);
    }
  };

  const handleReturnToLive = async () => {
    setIsLive(true);
    setHistoricalTimestamp(null);
    await loadInitialData();
  };

  const handleReset = async () => {
    if (!window.confirm('Reset demo environment to a clean baseline? This will clear all events and alerts, and return all users to normal.')) {
      return;
    }
    try {
      await resetDemoEnvironment().catch(() => {});
      handleInboundEvent({ type: 'system:reset' });
    } catch (err) {
      console.error('[App] Failed to reset demo environment:', err);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  const alertCount = alerts.length;
  const hasBadgedAlerts = alertCount > 0;

  return (
    <div className="app-container">
      {/* 1. Global Navbar with View Switcher */}
      <Navbar
        currentView={currentView}
        onSelectView={handleSelectView}
        isLive={isLive}
        historicalTime={historicalTimestamp}
        onReturnToLive={handleReturnToLive}
        isConnected={isConnected}
        onReset={handleReset}
      />

      {/* 2. Main View Switcher */}
      {currentView === 'modules' ? (
        <main className="dashboard-main">
          <ModuleUsageAnalytics
            liveEvents={events}
            onNavigateToThreatOps={() => handleSelectView('threat-ops')}
            onOpenSimulator={() => handleSelectView('simulator')}
          />
        </main>
      ) : currentView === 'simulator' ? (
        <main className="dashboard-main">
          <SimulationPanel
            onNavigateToDashboard={() => handleSelectView('threat-ops')}
          />
        </main>
      ) : (
        /* Default: Threat Operations Center */
        <main className="dashboard-main">
          {/* Metric Cards */}
          <OverviewStats stats={stats} />

          {/* Quick Notice to Highlight Module Downtime Feature */}
          <div className="module-feature-callout" onClick={() => handleSelectView('modules')}>
            <div className="callout-left">
              <span className="callout-icon">💡</span>
              <div>
                <strong>New Feature Active: Module Usage &amp; Downtime Maintenance Window Optimizer</strong>
                <p>Track what module each user is using (MOD-01 to MOD-09) and analyze optimal low-traffic repair windows (such as Module 8: 11 PM – 4 AM).</p>
              </div>
            </div>
            <button className="btn-callout-action">Open Module Analytics →</button>
          </div>

          {/* Graph + Right Panel */}
          <div className="content-grid">
            {/* D3 Hierarchical Tree */}
            <TemporalGraph
              hierarchyData={hierarchyData}
              onSelectUser={(userId) => setInvestigatingUserId(userId)}
              investigatingUserId={investigatingUserId}
              isLive={isLive}
            />

            {/* Alerts / Event Log Tabs */}
            <div className="side-panel">
              <div className="tabs-nav">
                <button
                  className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('alerts')}
                >
                  Security Alerts
                  <span className={`tab-badge ${hasBadgedAlerts ? 'badge-alert' : ''}`}>
                    {alertCount}
                  </span>
                </button>
                <button
                  className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                  onClick={() => setActiveTab('events')}
                >
                  Live Events
                  <span className="tab-badge">{events.length}</span>
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'alerts' ? (
                  <SecurityAlerts
                    alerts={alerts}
                    onSelectUser={(userId) => setInvestigatingUserId(userId)}
                  />
                ) : (
                  <EventLogViewer events={events} />
                )}
              </div>
            </div>
          </div>

          {/* Historical Scrubber */}
          <HistoricalSlider
            minTime={earliestEventTime}
            maxTime={new Date().toISOString()}
            currentTime={historicalTimestamp}
            isLive={isLive}
            onScrub={handleScrub}
            onReturnToLive={handleReturnToLive}
          />

          {/* Users Table */}
          <UserList
            users={users}
            onSelectUser={(userId) => setInvestigatingUserId(userId)}
          />
        </main>
      )}

      {/* Investigation Drawer */}
      <UserDetailDrawer
        userId={investigatingUserId}
        onClose={() => setInvestigatingUserId(null)}
      />
    </div>
  );
}
