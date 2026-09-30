from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: str
    rule_name: str
    severity: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip: Optional[str] = None
    description: str
    timestamp: datetime
    contributing_events: Optional[List[Dict[str, Any]]] = None
