from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.event_schema import CommonEventOut

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name: str
    department: Optional[str] = None
    role: Optional[str] = None
    status: str
    risk_score: int
    first_seen: datetime
    last_seen: datetime
    failed_login_count: int

class UserDetailOut(UserOut):
    active_sessions: List[str] = []
    observed_ips: List[str] = []
    accessed_resources: List[str] = []
    recent_events: List[CommonEventOut] = []
    alerts: List[Dict[str, Any]] = []
