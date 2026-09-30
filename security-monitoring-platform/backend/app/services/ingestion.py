import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.resource import Resource
from app.schemas.event_schema import CommonEventIn
from app.services.correlation import correlate_event, build_graph
from app.services.security_engine import evaluate_security_rules
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("uvicorn.error")

async def ingest_event(db: Session, event_in: CommonEventIn) -> dict:
    """
    Ingests, normalizes, deduplicates, correlates, and runs security detection on an incoming event.
    """
    # 1. Idempotency check (Section 50)
    existing = db.query(Event).filter(Event.event_id == event_in.event_id).first()
    if existing:
        logger.info(f"[Ingestion] Duplicate event {event_in.event_id} received. Skipping re-processing.")
        return {"event": existing, "alerts": [], "duplicate": True}

    # 2. Persist Event
    event = Event(
        event_id=event_in.event_id,
        user_id=event_in.user_id,
        session_id=event_in.session_id,
        event_type=event_in.event_type,
        timestamp=event_in.timestamp,
        ip=event_in.ip,
        resource=event_in.resource,
        source=event_in.source,
        status=event_in.status,
        security_flag=event_in.security_flag,
        raw_metadata=event_in.metadata,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # 3. Synchronize User state
    if event.user_id:
        user = db.query(User).filter(User.user_id == event.user_id).first()
        if not user:
            user = User(
                user_id=event.user_id,
                name=f"User {event.user_id}",
                department="General",
                role="Monitored User",
                status="active",
                risk_score=0,
                first_seen=event.timestamp,
                last_seen=event.timestamp,
                failed_login_count=1 if event.event_type == "login_failed" else 0
            )
            db.add(user)
        else:
            user.last_seen = event.timestamp
            if event.event_type == "login_failed":
                user.failed_login_count += 1
        db.commit()

    # 4. Synchronize Session state
    if event.session_id:
        session = db.query(SessionModel).filter(SessionModel.session_id == event.session_id).first()
        if not session and event.user_id:
            session = SessionModel(
                session_id=event.session_id,
                user_id=event.user_id,
                ip=event.ip,
                status="active" if event.event_type != "logout" else "terminated",
                created_at=event.timestamp,
                last_activity=event.timestamp,
                ended_at=event.timestamp if event.event_type == "logout" else None
            )
            db.add(session)
        elif session:
            session.last_activity = event.timestamp
            if event.event_type == "logout":
                session.status = "terminated"
                session.ended_at = event.timestamp
        db.commit()

    # 5. Synchronize Resource state
    if event.resource:
        resource = db.query(Resource).filter(Resource.name == event.resource).first()
        if not resource:
            classification = "CONFIDENTIAL" if any(k in event.resource.lower() for k in ["config", "finance", "audit"]) else "INTERNAL"
            resource = Resource(
                resource_id=f"RES-{abs(hash(event.resource)) % 100000}",
                name=event.resource,
                classification=classification,
                access_count=1,
                last_accessed=event.timestamp
            )
            db.add(resource)
        else:
            resource.access_count += 1
            resource.last_accessed = event.timestamp
        db.commit()

    # 6. Correlate Event into Graph Relationships
    correlate_event(db, event)

    # 7. Evaluate Security Rules
    generated_alerts = evaluate_security_rules(db, event)

    # 8. Broadcast Live Telemetry via WebSocket
    event_dict = {
        "event_id": event.event_id,
        "user_id": event.user_id,
        "session_id": event.session_id,
        "event_type": event.event_type,
        "timestamp": event.timestamp.isoformat(),
        "ip": event.ip,
        "resource": event.resource,
        "source": event.source,
        "status": event.status,
        "security_flag": event.security_flag
    }

    # Broadcast new event
    await ws_manager.broadcast("event:new", event_dict)

    # If alerts generated, broadcast alert
    for a in generated_alerts:
        await ws_manager.broadcast("event:alert", {
            "alert_id": a.alert_id,
            "rule_name": a.rule_name,
            "severity": a.severity,
            "user_id": a.user_id,
            "session_id": a.session_id,
            "ip": a.ip,
            "description": a.description,
            "timestamp": a.timestamp.isoformat()
        })

    # Broadcast updated graph
    updated_graph = build_graph(db)
    await ws_manager.broadcast("event:graph_update", updated_graph.model_dump())

    return {
        "event": event,
        "alerts": generated_alerts,
        "duplicate": False
    }
