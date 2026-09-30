from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.event import Event
from app.models.alert import SecurityAlert
from app.schemas.stats_schema import SystemStatsOut

router = APIRouter(prefix="/stats", tags=["System Statistics"])

@router.get("", response_model=SystemStatsOut)
def get_system_stats(db: Session = Depends(get_db)):
    """
    Returns real, computed server overview metrics derived strictly from stored database entities.
    """
    now = datetime.utcnow()
    one_min_ago = now - timedelta(minutes=1)

    total_users = db.query(User).count()
    active_sessions = db.query(SessionModel).filter(SessionModel.status == "active").count()
    
    # Active users: distinct users possessing an active session
    active_user_count = db.query(func.count(func.distinct(SessionModel.user_id))).filter(
        SessionModel.status == "active"
    ).scalar() or 0

    total_events = db.query(Event).count()
    events_last_min = db.query(Event).filter(Event.timestamp >= one_min_ago).count()

    total_alerts = db.query(SecurityAlert).count()
    
    # Severity breakdown
    severity_counts = {
        "LOW": db.query(SecurityAlert).filter(SecurityAlert.severity == "LOW").count(),
        "MEDIUM": db.query(SecurityAlert).filter(SecurityAlert.severity == "MEDIUM").count(),
        "HIGH": db.query(SecurityAlert).filter(SecurityAlert.severity == "HIGH").count(),
        "CRITICAL": db.query(SecurityAlert).filter(SecurityAlert.severity == "CRITICAL").count(),
    }

    last_event = db.query(Event.timestamp).order_by(Event.timestamp.desc()).first()
    last_event_time = last_event[0] if last_event else None

    return SystemStatsOut(
        server_status="ONLINE",
        total_users=total_users,
        active_users=active_user_count,
        active_sessions=active_sessions,
        events_per_minute=float(events_last_min),
        total_events=total_events,
        security_alerts_total=total_alerts,
        alerts_by_severity=severity_counts,
        last_event_time=last_event_time
    )
