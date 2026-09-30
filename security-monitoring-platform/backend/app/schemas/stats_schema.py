from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel

class SystemStatsOut(BaseModel):
    server_status: str = "ONLINE"
    total_users: int = 0
    active_users: int = 0
    active_sessions: int = 0
    events_per_minute: float = 0.0
    total_events: int = 0
    security_alerts_total: int = 0
    alerts_by_severity: Dict[str, int] = {
        "LOW": 0,
        "MEDIUM": 0,
        "HIGH": 0,
        "CRITICAL": 0
    }
    last_event_time: Optional[datetime] = None
