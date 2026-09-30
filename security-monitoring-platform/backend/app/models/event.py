from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, JSON
from app.models.base import Base

class Event(Base):
    __tablename__ = "events"

    event_id = Column(String(128), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=True)
    session_id = Column(String(128), index=True, nullable=True)
    event_type = Column(String(64), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    ip = Column(String(64), index=True, nullable=True)
    resource = Column(String(256), index=True, nullable=True)
    source = Column(String(64), default="nodejs-demo", nullable=False)
    status = Column(String(32), default="success", nullable=False)
    security_flag = Column(Boolean, default=False, nullable=False)
    raw_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
