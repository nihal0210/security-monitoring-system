from datetime import datetime
from typing import List, Set
from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.alert import SecurityAlert
from app.schemas.history_schema import HistoricalReconstructionOut
from app.schemas.user_schema import UserOut
from app.schemas.session_schema import SessionOut
from app.schemas.alert_schema import AlertOut
from app.schemas.event_schema import CommonEventOut
from app.services.correlation import build_graph

def reconstruct_state_at(db: Session, target_timestamp: datetime) -> HistoricalReconstructionOut:
    """
    Reconstructs the inferred state of the system at a specific historical point in time.
    Only events, sessions, alerts, and relationships that occurred on or before target_timestamp are used.
    """
    # 1. Fetch historical events up to target_timestamp
    events_query = db.query(Event).filter(
        Event.timestamp <= target_timestamp
    ).order_by(Event.timestamp.asc()).all()

    # 2. Extract observed user IDs, IPs, and Resources up to target_timestamp
    observed_user_ids: Set[str] = set()
    observed_ips: Set[str] = set()
    accessed_resources: Set[str] = set()

    for e in events_query:
        if e.user_id:
            observed_user_ids.add(e.user_id)
        if e.ip:
            observed_ips.add(e.ip)
        if e.resource:
            accessed_resources.add(e.resource)

    # 3. Active users at target_timestamp
    users = db.query(User).filter(User.user_id.in_(observed_user_ids)).all() if observed_user_ids else []
    user_outs = [UserOut.model_validate(u) for u in users]

    # 4. Sessions active at target_timestamp
    # Created <= target_timestamp and (not ended or ended > target_timestamp)
    active_sessions = db.query(SessionModel).filter(
        SessionModel.created_at <= target_timestamp,
        (SessionModel.ended_at == None) | (SessionModel.ended_at > target_timestamp)
    ).all()
    session_outs = [SessionOut.model_validate(s) for s in active_sessions]

    # 5. Security alerts triggered on or before target_timestamp
    historical_alerts = db.query(SecurityAlert).filter(
        SecurityAlert.timestamp <= target_timestamp
    ).order_by(SecurityAlert.timestamp.desc()).all()
    alert_outs = [AlertOut.model_validate(a) for a in historical_alerts]

    # 6. Reconstruct Graph at target_timestamp
    historical_graph = build_graph(db, up_to_timestamp=target_timestamp)

    # 7. Recent events window (up to last 20 events up to target_timestamp)
    recent_events_outs = [CommonEventOut.model_validate(e) for e in events_query[-20:]]

    return HistoricalReconstructionOut(
        mode="HISTORICAL",
        target_timestamp=target_timestamp,
        events_count_at_point=len(events_query),
        active_users=user_outs,
        active_sessions=session_outs,
        observed_ips=sorted(list(observed_ips)),
        accessed_resources=sorted(list(accessed_resources)),
        recent_events=recent_events_outs,
        active_alerts=alert_outs,
        graph=historical_graph
    )
