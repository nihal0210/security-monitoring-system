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

// Realistic offline fallback seed data in case backend is offline on remote presentation laptop
const FALLBACK_USERS = [
  { user_id: 'U001', name: 'Rahul Sharma', department: 'Engineering', role: 'Lead Architect', is_suspicious: false, risk_score: 0 },
  { user_id: 'U002', name: 'Amit Patel', department: 'Finance', role: 'Financial Analyst', is_suspicious: false, risk_score: 0 },
  { user_id: 'U003', name: 'Priya Singh', department: 'Human Resources', role: 'HR Manager', is_suspicious: false, risk_score: 0 },
  { user_id: 'U004', name: 'Neha Gupta', department: 'Sales', role: 'Account Executive', is_suspicious: false, risk_score: 0 },
  { user_id: 'U005', name: 'Rohan Verma', department: 'Marketing', role: 'Growth Lead', is_suspicious: false, risk_score: 0 }
];

const FALLBACK_HIERARCHY = {
  name: 'CENTRAL_SERVER',
  type: 'server',
  children: [
    {
      name: 'U001 (Rahul Sharma)',
      id: 'U001',
      type: 'user',
      is_suspicious: false,
      children: [
        { name: 'S-7k81-A1', type: 'session', children: [{ name: 'MOD-05 File Write', type: 'event' }] }
      ]
    },
    {
      name: 'U002 (Amit Patel)',
      id: 'U002',
      type: 'user',
      is_suspicious: false,
      children: [
        { name: 'S-9b34-F2', type: 'session', children: [{ name: 'MOD-04 File Access', type: 'event' }] }
      ]
    },
    {
      name: 'U003 (Priya Singh)',
      id: 'U003',
      type: 'user',
      is_suspicious: false,
      children: [
        { name: 'S-1c99-D5', type: 'session', children: [{ name: 'MOD-03 Voice Rec', type: 'event' }] }
      ]
    },
    {
      name: 'U004 (Neha Gupta)',
      id: 'U004',
      type: 'user',
      is_suspicious: false,
      children: [
        { name: 'S-3m22-X7', type: 'session', children: [{ name: 'MOD-06 View Once', type: 'event' }] }
      ]
    },
    {
      name: 'U005 (Rohan Verma)',
      id: 'U005',
      type: 'user',
      is_suspicious: false,
      children: [
        { name: 'S-5v88-K0', type: 'session', children: [{ name: 'MOD-07 Story Feed', type: 'event' }] }
      ]
    }
  ]
};

export default function App() {
  // Navigation view: 'threat-ops' | 'modules' | 'simulator'
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
  const [stats, setStats] = useState({
    server_status: 'ONLINE',
    total_users: 5,
    active_sessions: 5,
    events_count: 24,
    alerts_count: 0
  });
  const [users, setUsers] = useState(FALLBACK_USERS);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);

  // Hierarchical graph data (for D3 tree)
  const [hierarchyData, setHierarchyData] = useState(FALLBACK_HIERARCHY);

  // Live vs Historical mode
  const [isLive, setIsLive] = useState(true);
  const [historicalTimestamp, setHistoricalTimestamp] = useState(null);
  const [earliestEventTime, setEarliestEventTime] = useState(null);

  // Active tab in right panel
  const [activeTab, setActiveTab] = useState('alerts');

  // Selected user for investigation drawer
  const [investigatingUserId, setInvestigatingUserId] = useState(null);

  // Listen to hash changes (e.g. if user navigates with back button or URL hash)
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

  // ── Initial Data Load with Resilient Fallback ───────────────────
  const loadInitialData = useCallback(async () => {
    try {
      const [s, u, a, h, evs] = await Promise.all([
        fetchStats().catch(() => null),
        fetchUsers().catch(() => null),
        fetchAlerts().catch(() => null),
        fetchHierarchicalGraph().catch(() => null),
        fetchEvents({ limit: 100 }).catch(() => null)
      ]);

      if (s) setStats(s);
      if (u && u.length > 0) setUsers(u);
      if (a) setAlerts(a);
      if (h) setHierarchyData(h);
      if (evs && evs.length > 0) {
        setEvents(evs);
        setEarliestEventTime(evs[evs.length - 1].timestamp);
      }
    } catch (err) {
      console.warn('[App] Using resilient local seed baseline', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Real-Time Event Bus & WebSocket Message Handler ────────────
  const handleInboundEvent = useCallback((payload) => {
    const { type, data } = payload;

    if (type === 'event:new') {
      setEvents(prev => [data, ...prev.slice(0, 99)]);
      setEarliestEventTime(prev => prev || data.timestamp);

      // Update stats counts
      setStats(prev => ({
        ...prev,
        events_count: (prev?.events_count || 0) + 1
      }));

      // If live and connected to backend, refresh
      fetchStats().then(setStats).catch(() => {});
      fetchUsers().then(setUsers).catch(() => {});
      setTimeout(() => {
        fetchHierarchicalGraph().then(setHierarchyData).catch(() => {});
      }, 300);
    } else if (type === 'event:alert') {
      setAlerts(prev => [data, ...prev]);
      setActiveTab('alerts');

      // Update suspicious status in user list
      setUsers(prev => prev.map(u => {
        if (u.user_id === data.user_id) {
          return { ...u, is_suspicious: true, risk_score: Math.max(u.risk_score || 0, 75) };
        }
        return u;
      }));

      setStats(prev => ({
        ...prev,
        alerts_count: (prev?.alerts_count || 0) + 1
      }));

      fetchStats().then(setStats).catch(() => {});
      fetchUsers().then(setUsers).catch(() => {});
      setTimeout(() => {
        fetchHierarchicalGraph().then(setHierarchyData).catch(() => {});
      }, 400);
    } else if (type === 'system:reset') {
      setAlerts([]);
      setEvents([]);
      setUsers(FALLBACK_USERS);
      setHierarchyData(FALLBACK_HIERARCHY);
      setStats({
        server_status: 'ONLINE',
        total_users: 5,
        active_sessions: 5,
        events_count: 0,
        alerts_count: 0
      });
      loadInitialData();
    }
  }, [loadInitialData]);

  // Listen to WebSocket
  const { isConnected } = useWebSocket({ onMessage: handleInboundEvent });

  // Listen to Cross-Tab BroadcastChannel
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
