from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.models.base import Base

class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(String(128), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    ip = Column(String(64), nullable=True)
    status = Column(String(32), default="active", nullable=False) # 'active', 'terminated'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False)
