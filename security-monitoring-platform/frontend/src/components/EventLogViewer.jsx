import React, { useState } from 'react';
import { formatLocalTime } from '../utils/dateUtils';

const TYPE_LABELS = {
  login_success:   'Login',
  login_failed:    'Failed Login',
  logout:          'Logout',
  resource_access: 'File Access',
  api_request:     'API Request',
  session_created: 'Session',
};

function shortTime(iso) {
  return formatLocalTime(iso);
}

export default function EventLogViewer({ events }) {
  const [filterType, setFilterType] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filtered = (!events) ? [] : events.filter(e =>
    filterType === 'ALL' || e.event_type === filterType
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {['ALL', 'login_success', 'login_failed', 'resource_access', 'api_request', 'logout'].map(t => (
          <button
            key={t}
            className={`control-btn ${filterType === t ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '0.67rem' }}
            onClick={() => setFilterType(t)}
          >
            {TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', fontSize: '0.78rem' }}>
            No events yet
          </div>
        ) : (
          filtered.map((e) => (
            <div
              key={e.event_id}
              className="event-row"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedEvent(e)}
            >
              <span className="event-time">{shortTime(e.timestamp)}</span>
              <span className={`event-type-badge type-${e.event_type}`}>
                {TYPE_LABELS[e.event_type] || e.event_type}
              </span>
              <span className="event-user">{e.user_id || '—'}</span>
              <span className="event-resource">{e.resource || e.ip || ''}</span>
            </div>
          ))
        )}
      </div>

      {/* Raw JSON modal */}
      {selectedEvent && (
        <div className="drawer-backdrop" onClick={() => setSelectedEvent(null)}>
          <div
            style={{
              maxWidth: 560, width: '90%', margin: 'auto',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              borderRadius: 8, padding: 18, maxHeight: '80vh',
              display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Event — {selectedEvent.event_type}
              </span>
              <button className="btn-close" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <pre style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', padding: 12, borderRadius: 6,
              color: '#0f172a', fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
              overflowY: 'auto', flex: 1
            }}>
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
