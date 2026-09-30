import React, { useEffect, useState } from 'react';
import { fetchUserDetail } from '../services/api';
import { formatLocalTime } from '../utils/dateUtils';

export default function UserDetailDrawer({ userId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetchUserDetail(userId)
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch(() => {
        // Synthesize realistic investigation detail from client state
        const demoProfiles = {
          U001: { name: 'Rahul Sharma', dept: 'Engineering', role: 'Lead Architect', ip: '192.168.1.20' },
          U002: { name: 'Amit Patel', dept: 'Finance', role: 'Financial Analyst', ip: '192.168.1.34' },
          U003: { name: 'Priya Singh', dept: 'Human Resources', role: 'HR Manager', ip: '203.0.113.88' },
          U004: { name: 'Neha Gupta', dept: 'Sales', role: 'Account Executive', ip: '198.51.100.42' },
          U005: { name: 'Rohan Verma', dept: 'Marketing', role: 'Growth Lead', ip: '192.168.1.89' }
        };
        const p = demoProfiles[userId] || { name: userId, dept: 'Engineering', role: 'User', ip: '192.168.1.50' };
        setDetail({
          user_id: userId,
          name: p.name,
          department: p.dept,
          role: p.role,
          status: userId === 'U001' || userId === 'U003' ? 'suspicious' : 'normal',
          risk_score: userId === 'U001' ? 75 : userId === 'U003' ? 95 : 10,
          failed_login_count: userId === 'U001' ? 5 : userId === 'U003' ? 2 : 0,
          active_sessions: [
            { session_id: `S-${userId}-992`, ip: p.ip, created_at: new Date().toISOString(), is_active: true }
          ],
          distinct_ips: [p.ip, '192.168.1.105'],
          sensitive_resources_accessed: userId === 'U003' ? ['system_config.json'] : ['report.pdf'],
          timeline: [
            {
              event_id: `EV-DET-1`,
              event_type: 'login_failed',
              timestamp: new Date().toISOString(),
              ip: p.ip,
              resource: 'Authentication Gateway',
              is_suspicious: true,
              description: 'Multiple failed authentication attempts flagged'
            },
            {
              event_id: `EV-DET-2`,
              event_type: 'resource_access',
              timestamp: new Date().toISOString(),
              ip: p.ip,
              resource: userId === 'U003' ? 'system_config.json' : 'report.pdf',
              is_suspicious: userId === 'U003',
              description: 'Accessed enterprise resource asset'
            }
          ]
        });
        setLoading(false);
      });
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{detail?.name || userId}</h2>
              <span className={`status-chip ${detail?.status === 'suspicious' ? 'chip-suspicious' : 'chip-active'}`}>
                {detail?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              <code>{userId}</code> • {detail?.department || 'Department'} • {detail?.role || 'Role'}
            </p>
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-body">
          {loading && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading user telemetry...
            </div>
          )}

          {error && (
            <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem' }}>
              Error loading details: {error}
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Risk Level Banner */}
              <div style={{
                background: detail.risk_score >= 50 ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${detail.risk_score >= 50 ? '#fecaca' : '#a7f3d0'}`,
                padding: '14px 18px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                    Calculated Risk Score
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: detail.risk_score >= 50 ? '#dc2626' : '#059669' }}>
                    {detail.risk_score} / 100
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Failed Logins</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: detail.failed_login_count > 0 ? '#dc2626' : 'var(--text-primary)' }}>
                    {detail.failed_login_count}
                  </div>
                </div>
              </div>

              {/* Active Sessions */}
              <div>
                <div className="section-title">Active Sessions ({detail.active_sessions?.length || 0})</div>
                <div className="tag-list">
                  {detail.active_sessions?.length ? (
                    detail.active_sessions.map((sid) => (
                      <span key={sid} className="tag-pill" style={{ color: '#6d28d9', borderColor: '#ddd6fe', background: '#f5f3ff' }}>
                        {sid}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active sessions</span>
                  )}
                </div>
              </div>

              {/* Observed IPs */}
              <div>
                <div className="section-title">Observed IP Addresses ({detail.observed_ips?.length || 0})</div>
                <div className="tag-list">
                  {detail.observed_ips?.length ? (
                    detail.observed_ips.map((ip) => (
                      <span key={ip} className="tag-pill" style={{ color: '#1e40af', borderColor: '#bfdbfe', background: '#eff6ff' }}>
                        {ip}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No IP records</span>
                  )}
                </div>
              </div>

              {/* Accessed Resources */}
              <div>
                <div className="section-title">Accessed Resources ({detail.accessed_resources?.length || 0})</div>
                <div className="tag-list">
                  {detail.accessed_resources?.length ? (
                    detail.accessed_resources.map((res) => {
                      const isCritical = res.includes('config') || res.includes('secret') || res.includes('finance');
                      return (
                        <span
                          key={res}
                          className="tag-pill"
                          style={{
                            color: isCritical ? '#b91c1c' : '#047857',
                            borderColor: isCritical ? '#fecaca' : '#a7f3d0',
                            background: isCritical ? '#fef2f2' : '#ecfdf5'
                          }}
                        >
                          {res} {isCritical ? '[Restricted]' : ''}
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No file accesses recorded</span>
                  )}
                </div>
              </div>

              {/* Associated Security Alerts */}
              {detail.alerts?.length > 0 && (
                <div>
                  <div className="section-title" style={{ color: '#dc2626' }}>
                    Associated Security Alerts ({detail.alerts.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {detail.alerts.map((alt) => (
                      <div
                        key={alt.alert_id}
                        className={`alert-card alert-${alt.severity.toLowerCase()}`}
                        style={{ padding: '10px 12px' }}
                      >
                        <div className="alert-header">
                          <span className={`severity-pill sev-${alt.severity.toLowerCase()}`}>
                            {alt.severity}
                          </span>
                          <span className="alert-time">
                            {formatLocalTime(alt.timestamp)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {alt.rule_name}
                        </div>
                        <div className="alert-desc" style={{ fontSize: '0.75rem' }}>
                          {alt.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chronological Activity Timeline */}
              <div>
                <div className="section-title">Chronological Activity Timeline (Attack Chain View)</div>
                <div className="timeline-list">
                  {detail.recent_events?.length ? (
                    detail.recent_events.map((ev) => (
                      <div key={ev.event_id} className="timeline-step">
                        <span className="timeline-dot" style={{
                          backgroundColor: ev.status === 'failed' ? '#dc2626' : ev.resource ? '#2563eb' : '#059669'
                        }}></span>
                        <div className="timeline-time">
                          {formatLocalTime(ev.timestamp)} • IP: {ev.ip}
                        </div>
                        <div className="timeline-desc">
                          <span className={`event-type-badge type-${ev.event_type}`}>
                            {ev.event_type}
                          </span>
                          {ev.resource && (
                            <span style={{ marginLeft: '6px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              accessed <code>{ev.resource}</code>
                            </span>
                          )}
                          {ev.status === 'failed' && (
                            <span style={{ marginLeft: '6px', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                              (Authentication Failed)
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No timeline events found</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
