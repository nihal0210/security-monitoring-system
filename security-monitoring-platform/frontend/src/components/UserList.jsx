import React from 'react';
import { formatLocalTime } from '../utils/dateUtils';

function shortTime(iso) {
  return formatLocalTime(iso);
}

function getRiskColor(score) {
  if (score >= 60) return '#dc2626';
  if (score >= 30) return '#b45309';
  return '#166534';
}

export default function UserList({ users, onSelectUser }) {
  const sorted = [...(users || [])].sort((a, b) => {
    // Sort suspicious first, then by risk score desc
    if (a.status === 'suspicious' && b.status !== 'suspicious') return -1;
    if (b.status === 'suspicious' && a.status !== 'suspicious') return 1;
    return (b.risk_score || 0) - (a.risk_score || 0);
  });

  return (
    <div className="users-panel">
      <div className="panel-header">
        <div className="panel-title">
          Monitored Users
          <span className="panel-subtitle">
            {users?.length || 0} tracked
            {sorted.filter(u => u.status === 'suspicious').length > 0 && (
              <span style={{ color: '#dc2626', marginLeft: 8 }}>
                · {sorted.filter(u => u.status === 'suspicious').length} suspicious
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Status</th>
              <th>Risk Score</th>
              <th>Failed Logins</th>
              <th>Last Activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                  No users yet
                </td>
              </tr>
            ) : (
              sorted.map((u) => {
                const isSusp = u.status === 'suspicious';
                const statusClass = isSusp ? 'chip-suspicious' : u.status === 'active' ? 'chip-active' : 'chip-inactive';
                const riskColor = getRiskColor(u.risk_score || 0);

                return (
                  <tr key={u.user_id} className={isSusp ? 'row-suspicious' : ''}>
                    <td>
                      <code style={{ color: isSusp ? '#fca5a5' : '#5d7290', fontSize: '0.8rem' }}>
                        {u.user_id}
                      </code>
                    </td>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {u.department}
                      <span style={{ color: 'var(--text-muted)', marginLeft: 5 }}>· {u.role}</span>
                    </td>
                    <td>
                      <span className={`status-chip ${statusClass}`}>
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          backgroundColor: isSusp ? '#dc2626' : u.status === 'active' ? '#22c55e' : '#3d4f65'
                        }} />
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="risk-bar-container">
                        <div className="risk-bar">
                          <div
                            className="risk-fill"
                            style={{ width: `${Math.min(100, Math.max(4, u.risk_score || 0))}%`, backgroundColor: riskColor }}
                          />
                        </div>
                        <span className="risk-label" style={{ color: riskColor }}>{u.risk_score || 0}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                        color: (u.failed_login_count || 0) > 3 ? '#f87171' : 'var(--text-secondary)',
                        fontWeight: (u.failed_login_count || 0) > 3 ? 600 : 400
                      }}>
                        {u.failed_login_count || 0}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {u.last_seen ? shortTime(u.last_seen) : '—'}
                    </td>
                    <td>
                      <button
                        className={`btn-investigate ${isSusp ? 'suspicious-btn' : ''}`}
                        onClick={() => onSelectUser(u.user_id)}
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
