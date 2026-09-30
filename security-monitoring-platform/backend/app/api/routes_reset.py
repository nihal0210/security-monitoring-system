import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.event import Event
from app.models.alert import SecurityAlert
from app.models.session import Session as SessionModel
from app.models.resource import Resource
from app.models.relationship import Relationship
from app.models.user import User
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/reset", tags=["Demo Reset"])


@router.post("", summary="Reset demo environment to clean baseline")
async def reset_demo_environment(db: Session = Depends(get_db)):
    """
    Wipes all generated scenario data and restores a clean baseline state:
    - Deletes all Events
    - Deletes all SecurityAlerts
    - Deletes all Sessions
    - Deletes all Resources
    - Deletes all Relationships EXCEPT the initial SERVER->USER links
    - Resets all User status to 'active' and risk_score to 0, failed_login_count to 0
    
    This is intended for demonstration resets only.
    """
    try:
        # 1. Delete all events
        event_count = db.query(Event).count()
        db.query(Event).delete(synchronize_session=False)

        # 2. Delete all security alerts
        alert_count = db.query(SecurityAlert).count()
        db.query(SecurityAlert).delete(synchronize_session=False)

        # 3. Delete all sessions
        session_count = db.query(SessionModel).count()
        db.query(SessionModel).delete(synchronize_session=False)

        # 4. Delete all resources
        resource_count = db.query(Resource).count()
        db.query(Resource).delete(synchronize_session=False)

        # 5. Delete all relationships EXCEPT the base SERVER->USER MONITORS links
        #    (keep them so users appear in the graph without any events)
        rel_count = db.query(Relationship).filter(
            ~((Relationship.source_type == "SERVER") & (Relationship.relation_type == "MONITORS"))
        ).count()
        db.query(Relationship).filter(
            ~((Relationship.source_type == "SERVER") & (Relationship.relation_type == "MONITORS"))
        ).delete(synchronize_session=False)

        # Delete any non-canonical test users (not U001..U005)
        canonical_ids = ["U001", "U002", "U003", "U004", "U005"]
        db.query(Relationship).filter(
            Relationship.target_type == "USER",
            ~Relationship.target_id.in_(canonical_ids)
        ).delete(synchronize_session=False)
        db.query(User).filter(~User.user_id.in_(canonical_ids)).delete(synchronize_session=False)

        # 6. Reset canonical user details
        canonical_info = {
            "U001": ("Rahul Sharma", "Engineering", "Lead Architect"),
            "U002": ("Amit Patel", "Finance", "Financial Analyst"),
            "U003": ("Priya Singh", "Human Resources", "HR Manager"),
            "U004": ("Neha Gupta", "Sales", "Account Executive"),
            "U005": ("Rohan Verma", "Marketing", "Growth Lead"),
        }
        for uid, (name, dept, role) in canonical_info.items():
            u = db.query(User).filter(User.user_id == uid).first()
            if not u:
                u = User(user_id=uid, name=name, department=dept, role=role)
                db.add(u)
            else:
                u.name = name
                u.department = dept
                u.role = role
                u.status = "active"
                u.risk_score = 0
                u.failed_login_count = 0

            # Ensure SERVER->USER MONITORS relationship exists
            rel = db.query(Relationship).filter(
                Relationship.source_type == "SERVER",
                Relationship.target_type == "USER",
                Relationship.target_id == uid,
                Relationship.relation_type == "MONITORS"
            ).first()
            if not rel:
                db.add(Relationship(
                    source_type="SERVER",
                    source_id="SERVER",
                    target_type="USER",
                    target_id=uid,
                    relation_type="MONITORS"
                ))

        db.commit()
        users = db.query(User).all()

        logger.info(
            f"[Reset] Demo environment wiped: "
            f"{event_count} events, {alert_count} alerts, {session_count} sessions, "
            f"{resource_count} resources, {rel_count} relationships deleted. "
            f"{len(users)} users reset to baseline."
        )

        # 7. Broadcast reset event via WebSocket so frontend updates immediately
        await ws_manager.broadcast("system:reset", {
            "message": "Demo environment reset to clean baseline",
            "users_reset": len(users),
            "events_deleted": event_count,
            "alerts_deleted": alert_count
        })

        return {
            "status": "success",
            "message": "Demo environment has been reset to a clean baseline",
            "deleted": {
                "events": event_count,
                "alerts": alert_count,
                "sessions": session_count,
                "resources": resource_count,
                "relationships": rel_count
            },
            "reset": {
                "users": len(users),
                "all_set_to_active": True,
                "risk_scores_zeroed": True
            }
        }

    except Exception as e:
        db.rollback()
        logger.error(f"[Reset] Failed to reset demo environment: {e}")
        raise
