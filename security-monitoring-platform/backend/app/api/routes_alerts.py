from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.alert import SecurityAlert
from app.schemas.alert_schema import AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertOut])
def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')"),
    user_id: Optional[str] = Query(None, description="Filter by User ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(SecurityAlert)
    if severity:
        query = query.filter(SecurityAlert.severity == severity.upper())
    if user_id:
        query = query.filter(SecurityAlert.user_id == user_id)

    alerts = query.order_by(SecurityAlert.timestamp.desc()).limit(limit).all()
    return alerts
