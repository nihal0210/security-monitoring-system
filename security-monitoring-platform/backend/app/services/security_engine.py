import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.user import User
from app.models.alert import SecurityAlert

logger = logging.getLogger("uvicorn.error")

def evaluate_security_rules(db: Session, current_event: Event) -> List[SecurityAlert]:
    """
    Evaluates deterministic security rules on the current event and historical context.
    Returns any newly generated SecurityAlerts.
    """
    alerts: List[SecurityAlert] = []

    # 1. Rule 1: Repeated Failed Login Attempts
    # >= 5 failed logins within 2 minutes for the same user
    if current_event.event_type == "login_failed" and current_event.user_id:
        window_start = current_event.timestamp - timedelta(minutes=2)
        failed_attempts = db.query(Event).filter(
            Event.user_id == current_event.user_id,
            Event.event_type == "login_failed",
            Event.timestamp >= window_start,
            Event.timestamp <= current_event.timestamp
        ).order_by(Event.timestamp.desc()).all()

        if len(failed_attempts) >= 5:
            # Check if alert already triggered for this cluster to avoid duplicate alert spam
            recent_alert = db.query(SecurityAlert).filter(
                SecurityAlert.rule_name == "RULE_REPEATED_FAILED_LOGIN",
                SecurityAlert.user_id == current_event.user_id,
                SecurityAlert.timestamp >= window_start
            ).first()

            if not recent_alert:
                alert = SecurityAlert(
                    alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    rule_name="RULE_REPEATED_FAILED_LOGIN",
                    severity="HIGH",
                    user_id=current_event.user_id,
                    session_id=current_event.session_id,
                    ip=current_event.ip,
                    description=f"Potential brute-force indicator: User {current_event.user_id} observed with {len(failed_attempts)} consecutive failed authentication attempts within 2 minutes.",
                    timestamp=current_event.timestamp,
                    contributing_events=[
                        {"event_id": e.event_id, "timestamp": e.timestamp.isoformat(), "ip": e.ip}
                        for e in failed_attempts[:5]
                    ]
                )
                alerts.append(alert)
                _flag_user_suspicious(db, current_event.user_id, 45)

    # 2. Rule 2: Multiple Rapid Logins
    # Same user with multiple successful logins in < 15 seconds from different sessions
    if current_event.event_type == "login_success" and current_event.user_id:
        window_start = current_event.timestamp - timedelta(seconds=15)
        recent_logins = db.query(Event).filter(
            Event.user_id == current_event.user_id,
            Event.event_type == "login_success",
            Event.timestamp >= window_start,
            Event.timestamp <= current_event.timestamp
        ).all()

        distinct_sessions = {e.session_id for e in recent_logins if e.session_id}
        if len(distinct_sessions) >= 2:
            recent_alert = db.query(SecurityAlert).filter(
                SecurityAlert.rule_name == "RULE_RAPID_MULTIPLE_LOGINS",
                SecurityAlert.user_id == current_event.user_id,
                SecurityAlert.timestamp >= window_start
            ).first()

            if not recent_alert:
                alert = SecurityAlert(
                    alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    rule_name="RULE_RAPID_MULTIPLE_LOGINS",
                    severity="MEDIUM",
                    user_id=current_event.user_id,
                    session_id=current_event.session_id,
                    ip=current_event.ip,
                    description=f"Concurrent authentication anomaly: User {current_event.user_id} established {len(distinct_sessions)} distinct sessions within 15 seconds.",
                    timestamp=current_event.timestamp,
                    contributing_events=[
                        {"event_id": e.event_id, "session_id": e.session_id, "timestamp": e.timestamp.isoformat(), "ip": e.ip}
                        for e in recent_logins
                    ]
                )
                alerts.append(alert)
                _flag_user_suspicious(db, current_event.user_id, 25)

    # 3. Rule 3: Multiple IP Addresses
    # Same user observed across >= 3 distinct IP addresses within 5 minutes
    if current_event.user_id and current_event.ip:
        window_start = current_event.timestamp - timedelta(minutes=5)
        user_events = db.query(Event).filter(
            Event.user_id == current_event.user_id,
            Event.timestamp >= window_start,
            Event.timestamp <= current_event.timestamp
        ).all()

        distinct_ips = {e.ip for e in user_events if e.ip}
        if len(distinct_ips) >= 3:
            recent_alert = db.query(SecurityAlert).filter(
                SecurityAlert.rule_name == "RULE_MULTIPLE_IP_ACTIVITY",
                SecurityAlert.user_id == current_event.user_id,
                SecurityAlert.timestamp >= window_start
            ).first()

            if not recent_alert:
                alert = SecurityAlert(
                    alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    rule_name="RULE_MULTIPLE_IP_ACTIVITY",
                    severity="HIGH",
                    user_id=current_event.user_id,
                    session_id=current_event.session_id,
                    ip=current_event.ip,
                    description=f"Multi-homed access anomaly: User {current_event.user_id} was observed acting from {len(distinct_ips)} distinct IP addresses ({', '.join(distinct_ips)}) within 5 minutes.",
                    timestamp=current_event.timestamp,
                    contributing_events=[
                        {"event_id": e.event_id, "ip": e.ip, "timestamp": e.timestamp.isoformat()}
                        for e in user_events if e.ip in distinct_ips
                    ]
                )
                alerts.append(alert)
                _flag_user_suspicious(db, current_event.user_id, 40)

    # 4. Rule 4: Suspicious Activity Sequence
    # Pattern: Failed login(s) -> Successful login -> Sensitive resource access within 3 minutes
    if current_event.event_type == "resource_access" and current_event.user_id:
        is_sensitive = current_event.resource and any(
            kw in current_event.resource.lower() for kw in ["config", "secret", "finance", "audit", "customer"]
        )

        if is_sensitive:
            window_start = current_event.timestamp - timedelta(minutes=3)
            # Find prior events for this user in window
            prior_events = db.query(Event).filter(
                Event.user_id == current_event.user_id,
                Event.timestamp >= window_start,
                Event.timestamp < current_event.timestamp
            ).order_by(Event.timestamp.asc()).all()

            has_failed_login = any(e.event_type == "login_failed" for e in prior_events)
            has_success_login = any(e.event_type == "login_success" for e in prior_events)

            if has_failed_login and has_success_login:
                recent_alert = db.query(SecurityAlert).filter(
                    SecurityAlert.rule_name == "RULE_SUSPICIOUS_ACTIVITY_SEQUENCE",
                    SecurityAlert.user_id == current_event.user_id,
                    SecurityAlert.timestamp >= window_start
                ).first()

                if not recent_alert:
                    alert = SecurityAlert(
                        alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        rule_name="RULE_SUSPICIOUS_ACTIVITY_SEQUENCE",
                        severity="CRITICAL",
                        user_id=current_event.user_id,
                        session_id=current_event.session_id,
                        ip=current_event.ip,
                        description=f"Potential account compromise chain: User {current_event.user_id} transitioned from failed login retries to successful authentication and immediate access to sensitive file '{current_event.resource}'.",
                        timestamp=current_event.timestamp,
                        contributing_events=[
                            {"event_id": e.event_id, "type": e.event_type, "timestamp": e.timestamp.isoformat(), "ip": e.ip}
                            for e in prior_events
                        ] + [{"event_id": current_event.event_id, "type": "resource_access", "resource": current_event.resource, "timestamp": current_event.timestamp.isoformat()}]
                    )
                    alerts.append(alert)
                    _flag_user_suspicious(db, current_event.user_id, 65)

    # 5. Rule 5: Abnormal API Activity (Burst / Volume)
    # >= 15 requests within 30 seconds (relaxed from 20/10s to account for connector queue latency)
    if current_event.user_id:
        window_start = current_event.timestamp - timedelta(seconds=30)
        recent_count = db.query(Event).filter(
            Event.user_id == current_event.user_id,
            Event.timestamp >= window_start,
            Event.timestamp <= current_event.timestamp
        ).count()

        if recent_count >= 15:
            recent_alert = db.query(SecurityAlert).filter(
                SecurityAlert.rule_name == "RULE_ABNORMAL_API_BURST",
                SecurityAlert.user_id == current_event.user_id,
                SecurityAlert.timestamp >= window_start
            ).first()

            if not recent_alert:
                alert = SecurityAlert(
                    alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    rule_name="RULE_ABNORMAL_API_BURST",
                    severity="MEDIUM",
                    user_id=current_event.user_id,
                    session_id=current_event.session_id,
                    ip=current_event.ip,
                    description=f"Abnormal traffic volume: User {current_event.user_id} generated {recent_count} requests in under 10 seconds.",
                    timestamp=current_event.timestamp,
                    contributing_events=[
                        {"event_id": current_event.event_id, "count": recent_count, "window_seconds": 10}
                    ]
                )
                alerts.append(alert)
                _flag_user_suspicious(db, current_event.user_id, 30)

    # Persist any generated alerts
    for a in alerts:
        db.add(a)
    if alerts:
        try:
            db.commit()
            for a in alerts:
                logger.info(f"[SecurityEngine] Generated Alert: {a.rule_name} (Severity: {a.severity}) for user {a.user_id}")
        except Exception as e:
            logger.error(f"[SecurityEngine] Error persisting alerts: {e}")
            db.rollback()

    return alerts


def _flag_user_suspicious(db: Session, user_id: str, risk_increment: int):
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        user.status = "suspicious"
        user.risk_score = min(100, user.risk_score + risk_increment)
        try:
            db.commit()
        except Exception:
            db.rollback()
