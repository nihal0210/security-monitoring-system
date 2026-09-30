from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.event import Event
from app.schemas.event_schema import CommonEventOut

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[CommonEventOut])
def list_events(
    user_id: Optional[str] = Query(None, description="Filter by User ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    from_time: Optional[datetime] = Query(None, description="Start timestamp (UTC)"),
    to_time: Optional[datetime] = Query(None, description="End timestamp (UTC)"),
    limit: int = Query(100, ge=1, le=500, description="Max events to return"),
    db: Session = Depends(get_db)
):
    """
    Returns stored events with optional multi-dimensional filtering.
    """
    query = db.query(Event)

    if user_id:
        query = query.filter(Event.user_id == user_id)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    if from_time:
        query = query.filter(Event.timestamp >= from_time)
    if to_time:
        query = query.filter(Event.timestamp <= to_time)

    events = query.order_by(Event.timestamp.desc()).limit(limit).all()
    return events

@router.get("/{event_id}", response_model=CommonEventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
