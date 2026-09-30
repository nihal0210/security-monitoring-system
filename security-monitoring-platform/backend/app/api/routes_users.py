from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.event import Event
from app.models.alert import SecurityAlert
from app.schemas.user_schema import UserOut, UserDetailOut
from app.schemas.event_schema import CommonEventOut

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    """
    Returns all monitored users ordered by last seen activity.
    """
    users = db.query(User).order_by(User.last_seen.desc()).all()
    return users

@router.get("/{user_id}", response_model=UserDetailOut)
def get_user_detail(user_id: str, db: Session = Depends(get_db)):
    """
    Returns comprehensive investigation details for a specific user:
    active sessions, observed IP addresses, accessed resources, recent timeline events, and triggered security alerts.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch user's active sessions
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == user_id,
        SessionModel.status == "active"
    ).all()
    active_sessions = [s.session_id for s in sessions]

    # Fetch user's events
    events = db.query(Event).filter(
        Event.user_id == user_id
    ).order_by(Event.timestamp.desc()).limit(100).all()

    observed_ips = sorted(list({e.ip for e in events if e.ip}))
    accessed_resources = sorted(list({e.resource for e in events if e.resource}))
    recent_events = [CommonEventOut.model_validate(e) for e in events[:30]]

    # Fetch user's alerts
    alerts = db.query(SecurityAlert).filter(
        SecurityAlert.user_id == user_id
    ).order_by(SecurityAlert.timestamp.desc()).all()
    alert_dicts = [
        {
            "alert_id": a.alert_id,
            "rule_name": a.rule_name,
            "severity": a.severity,
            "description": a.description,
            "timestamp": a.timestamp.isoformat(),
            "contributing_events": a.contributing_events
        }
        for a in alerts
    ]

    return UserDetailOut(
        user_id=user.user_id,
        name=user.name,
        department=user.department,
        role=user.role,
        status=user.status,
        risk_score=user.risk_score,
        first_seen=user.first_seen,
        last_seen=user.last_seen,
        failed_login_count=user.failed_login_count,
        active_sessions=active_sessions,
        observed_ips=observed_ips,
        accessed_resources=accessed_resources,
        recent_events=recent_events,
        alerts=alert_dicts
    )
