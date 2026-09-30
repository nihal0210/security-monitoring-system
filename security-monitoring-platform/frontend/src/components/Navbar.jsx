import React, { useState, useEffect } from 'react';
import { formatLocalTime } from '../utils/dateUtils';

export default function Navbar({
  currentView = 'threat-ops',
  onSelectView,
  isLive,
  historicalTime,
  onReturnToLive,
  isConnected,
  onReset
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-CA');
      const timePart = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTime(`${datePart} ${timePart}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="nav-brand" onClick={() => onSelectView('threat-ops')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="brand-titles">
            <h1>Security &amp; Module Telemetry Platform</h1>
            <p>Real-Time Temporal Correlation &amp; Downtime Analytics</p>
          </div>
        </div>

        {/* Primary Page Navigation Tabs */}
        <nav className="nav-view-tabs">
          <button
            className={`nav-tab-btn ${currentView === 'threat-ops' ? 'active' : ''}`}
            onClick={() => onSelectView('threat-ops')}
          >
            <span className="tab-icon">🛡️</span>
            Threat Operations &amp; Graph
          </button>
          <button
            className={`nav-tab-btn ${currentView === 'modules' ? 'active' : ''}`}
            onClick={() => onSelectView('modules')}
          >
            <span className="tab-icon">📊</span>
            Module Usage &amp; Downtime Optimizer
            <span className="nav-highlight-badge">9 Modules</span>
          </button>
          <button
            className={`nav-tab-btn ${currentView === 'simulator' ? 'active' : ''}`}
            onClick={() => onSelectView('simulator')}
          >
            <span className="tab-icon">⚡</span>
            Simulator Deck
          </button>
        </nav>
      </div>

      <div className="nav-actions">
        {/* Open simulator in separate tab */}
        <a
          href="#simulator"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-open-sim-tab"
          title="Open Simulator in a separate window/tab for live multi-screen demonstration"
        >
          <span>Open Simulator in Tab 2 ↗</span>
        </a>

        {/* Mode badge */}
        {isLive ? (
          <div className="badge-mode mode-live">
            <span className="pulse-dot pulse-live" />
            Live Telemetry
          </div>
        ) : (
          <div className="badge-mode mode-historical">
            <span className="pulse-dot pulse-historical" />
            Historical · {historicalTime ? formatLocalTime(historicalTime) : ''}
          </div>
        )}

        {/* Return to Live */}
        {!isLive && (
          <button className="btn-live-return" onClick={onReturnToLive}>
            Return to Live
          </button>
        )}

        {/* Reset to Clean Baseline */}
        {onReset && (
          <button
            className="btn-reset-demo"
            onClick={onReset}
            title="Wipe alerts/events and restore users to normal baseline"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
        )}

        {/* WebSocket / Cross-Tab Status */}
        <div className="ws-indicator" title="Connected to local telemetry and cross-tab stream">
          <span className={`ws-dot ${isConnected ? 'ws-connected' : 'ws-connected'}`} />
          {isConnected ? 'Stream Active' : 'Stream Ready'}
        </div>

        {/* Clock */}
        <div className="clock-display">{currentTime}</div>
      </div>
    </header>
  );
}
