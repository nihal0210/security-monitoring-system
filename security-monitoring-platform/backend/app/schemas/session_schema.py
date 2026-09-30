from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    user_id: str
    ip: Optional[str] = None
    status: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    last_activity: datetime
