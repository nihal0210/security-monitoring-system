import React from 'react';
import { formatLocalDateTime } from '../utils/dateUtils';

const RULE_LABELS = {
  RULE_REPEATED_FAILED_LOGIN:     'Repeated Failed Login',
  RULE_RAPID_MULTIPLE_LOGINS:     'Rapid Multiple Logins',
  RULE_MULTIPLE_IP_ACTIVITY:      'Multiple IP Activity',
  RULE_SUSPICIOUS_ACTIVITY_SEQUENCE: 'Suspicious Activity Sequence',
  RULE_ABNORMAL_API_BURST:        'Abnormal API Burst',
};

function timeStr(iso) {
  return formatLocalDateTime(iso);
}

export default function SecurityAlerts({ alerts, onSelectUser }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="alert-empty">
        <div style={{ marginBottom: 8, fontSize: '1.5rem', opacity: 0.2 }}>◎</div>
        <div>No security alerts</div>
        <div style={{ marginTop: 4, fontSize: '0.7rem' }}>System is operating normally</div>
      </div>
    );
  }

  return (
    <>
      {alerts.map((alert) => {
        const sev = (alert.severity || 'LOW').toLowerCase();
        const ruleLabel = RULE_LABELS[alert.rule_name] || alert.rule_name;
        return (
          <div
            key={alert.alert_id}
            className={`alert-card alert-${sev}`}
            onClick={() => alert.user_id && onSelectUser && onSelectUser(alert.user_id)}
            title={`Click to investigate ${alert.user_id}`}
          >
            <div className="alert-header">
              <span className={`severity-pill sev-${sev}`}>{alert.severity}</span>
              <span className="alert-time">{timeStr(alert.timestamp)}</span>
            </div>
            <div className="alert-rule">{ruleLabel}</div>
            {alert.user_id && (
              <div className="alert-user">User: {alert.user_id}</div>
            )}
            <div className="alert-desc">{alert.description}</div>
            {alert.user_id && (
              <div style={{ marginTop: 4 }}>
                <span
                  style={{ fontSize: '0.67rem', color: '#3d6fa8', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); onSelectUser && onSelectUser(alert.user_id); }}
                >
                  Investigate →
                </span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
