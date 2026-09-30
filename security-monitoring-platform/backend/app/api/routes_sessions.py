from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.session import Session as SessionModel
from app.schemas.session_schema import SessionOut

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.get("", response_model=List[SessionOut])
def list_sessions(
    status: Optional[str] = Query(None, description="Filter by status ('active' or 'terminated')"),
    user_id: Optional[str] = Query(None, description="Filter by User ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(SessionModel)
    if status:
        query = query.filter(SessionModel.status == status)
    if user_id:
        query = query.filter(SessionModel.user_id == user_id)

    sessions = query.order_by(SessionModel.last_activity.desc()).limit(limit).all()
    return sessions
