from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel
from app.schemas.graph_schema import GraphDataOut
from app.schemas.user_schema import UserOut
from app.schemas.session_schema import SessionOut
from app.schemas.alert_schema import AlertOut
from app.schemas.event_schema import CommonEventOut

class HistoricalReconstructionOut(BaseModel):
    mode: str = "HISTORICAL"
    target_timestamp: datetime
    events_count_at_point: int
    active_users: List[UserOut]
    active_sessions: List[SessionOut]
    observed_ips: List[str]
    accessed_resources: List[str]
    recent_events: List[CommonEventOut]
    active_alerts: List[AlertOut]
    graph: GraphDataOut
