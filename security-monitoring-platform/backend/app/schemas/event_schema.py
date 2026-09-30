from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

class CommonEventIn(BaseModel):
    event_id: str = Field(..., description="Unique event identifier")
    user_id: Optional[str] = Field(None, description="Identifier of the user")
    session_id: Optional[str] = Field(None, description="Active session ID")
    event_type: str = Field(..., description="Event type, e.g., login_success, login_failed, resource_access")
    timestamp: datetime = Field(..., description="ISO 8601 UTC timestamp of occurrence")
    ip: Optional[str] = Field("127.0.0.1", description="Client IP address")
    resource: Optional[str] = Field(None, description="Resource or file accessed")
    source: str = Field("nodejs-demo", description="Source identifier")
    status: str = Field("success", description="Status: success or failed")
    security_flag: bool = Field(False, description="Flag indicating prior security context")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary contextual metadata")

class BatchEventIn(BaseModel):
    events: List[CommonEventIn]

class CommonEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    user_id: Optional[str]
    session_id: Optional[str]
    event_type: str
    timestamp: datetime
    ip: Optional[str]
    resource: Optional[str]
    source: str
    status: str
    security_flag: bool
    raw_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
