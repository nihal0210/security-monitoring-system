import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.alert import SecurityAlert
from app.models.session import Session as SessionModel

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/graph/hierarchical", tags=["Hierarchical Graph"])


@router.get("", summary="Returns structured user->event hierarchy for the temporal tree visualization")
def get_hierarchical_graph(
    up_to_timestamp: Optional[datetime] = Query(None, description="Reconstruct state up to this UTC timestamp"),
    db: Session = Depends(get_db)
):
    """
    Returns a structured hierarchy: Server → Users → Events (chronological).
    This powers the D3 hierarchical tree visualization.
    
    Each user node contains:
    - user metadata (id, name, department, role, status, risk_score)
    - chronological list of events (event_id, type, timestamp, ip, resource, session_id)
    - whether any alerts are associated with that user (and max severity)
    - pre-computed isSuspicious flag per event (based on associated alert time windows)
    """
    try:
        # 1. Determine time filter
        time_filter = up_to_timestamp

        # 2. Load all users
        users = db.query(User).order_by(User.user_id).all()

        # 3. Load all alerts (for suspicious flagging)
        alert_query = db.query(SecurityAlert)
        if time_filter:
            alert_query = alert_query.filter(SecurityAlert.timestamp <= time_filter)
        all_alerts = alert_query.order_by(SecurityAlert.timestamp.desc()).all()

        # Build a set of suspicious user IDs and their alert info
        suspicious_users: dict = {}  # user_id -> {"severity": str, "rule": str, "alert_id": str}
        for alert in all_alerts:
            if alert.user_id and alert.user_id not in suspicious_users:
                suspicious_users[alert.user_id] = {
                    "alert_id": alert.alert_id,
                    "severity": alert.severity,
                    "rule_name": alert.rule_name,
                    "description": alert.description,
                    "timestamp": alert.timestamp.isoformat()
                }

        # 4. Build user event lists
        user_data = []
        for user in users:
            # Load events for this user
            event_query = db.query(Event).filter(Event.user_id == user.user_id)
            if time_filter:
                event_query = event_query.filter(Event.timestamp <= time_filter)
            user_events = event_query.order_by(Event.timestamp.asc()).all()

            # Determine if user has alerts
            user_alert_info = suspicious_users.get(user.user_id)
            has_alerts = user_alert_info is not None

            # For each event, determine if it's part of a suspicious sequence
            # An event is suspicious if the user has an alert AND the event is within the alert's
            # contributing event list (or is a login_failed/login_success in a suspicious window)
            alert_contributing_event_ids = set()
            user_alerts_list = []
            if has_alerts:
                user_specific_alerts = [a for a in all_alerts if a.user_id == user.user_id]
                for ua in user_specific_alerts:
                    user_alerts_list.append({
                        "alert_id": ua.alert_id,
                        "severity": ua.severity,
                        "rule_name": ua.rule_name,
                        "description": ua.description,
                        "timestamp": ua.timestamp.isoformat()
                    })
                    if ua.contributing_events:
                        for ce in ua.contributing_events:
                            if isinstance(ce, dict) and "event_id" in ce:
                                alert_contributing_event_ids.add(ce["event_id"])

            # Build event list with suspicious flags
            events_out = []
            for ev in user_events:
                is_suspicious_event = (
                    ev.event_id in alert_contributing_event_ids or
                    (has_alerts and ev.event_type in ["login_failed", "login_success", "resource_access"] and
                     any(
                         abs((ev.timestamp - datetime.fromisoformat(ua["timestamp"])).total_seconds()) < 300
                         for ua in user_alerts_list
                     ))
                )
                events_out.append({
                    "event_id": ev.event_id,
                    "event_type": ev.event_type,
                    "timestamp": ev.timestamp.isoformat(),
                    "ip": ev.ip,
                    "resource": ev.resource,
                    "session_id": ev.session_id,
                    "status": ev.status,
                    "is_suspicious": is_suspicious_event
                })

            # Determine effective user status
            effective_status = user.status
            if has_alerts and effective_status != "suspicious":
                effective_status = "suspicious"

            # Get max alert severity for this user
            max_severity = None
            if user_alerts_list:
                sev_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
                max_severity = max(user_alerts_list, key=lambda a: sev_order.get(a["severity"], 0))["severity"]

            user_data.append({
                "user_id": user.user_id,
                "name": user.name,
                "department": user.department,
                "role": user.role,
                "status": effective_status,
                "risk_score": user.risk_score,
                "failed_login_count": user.failed_login_count,
                "first_seen": user.first_seen.isoformat() if user.first_seen else None,
                "last_seen": user.last_seen.isoformat() if user.last_seen else None,
                "has_alerts": has_alerts,
                "max_alert_severity": max_severity,
                "alerts": user_alerts_list,
                "event_count": len(events_out),
                "events": events_out
            })

        # 5. Summary alert list (most recent 20)
        recent_alerts = []
        for a in all_alerts[:20]:
            recent_alerts.append({
                "alert_id": a.alert_id,
                "rule_name": a.rule_name,
                "severity": a.severity,
                "user_id": a.user_id,
                "description": a.description,
                "timestamp": a.timestamp.isoformat()
            })

        return {
            "server": {
                "id": "SERVER",
                "label": "ENTERPRISE SERVER",
                "status": "online",
                "user_count": len(users),
                "suspicious_count": len(suspicious_users),
                "total_alerts": len(all_alerts)
            },
            "users": user_data,
            "alerts": recent_alerts,
            "generated_at": datetime.utcnow().isoformat(),
            "historical": time_filter is not None,
            "up_to_timestamp": time_filter.isoformat() if time_filter else None
        }

    except Exception as e:
        logger.error(f"[HierarchicalGraph] Error building hierarchy: {e}")
        raise
