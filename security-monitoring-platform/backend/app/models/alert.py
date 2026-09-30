from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON
from app.models.base import Base

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    alert_id = Column(String(128), primary_key=True, index=True)
    rule_name = Column(String(128), index=True, nullable=False)
    severity = Column(String(32), index=True, nullable=False) # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    user_id = Column(String(64), index=True, nullable=True)
    session_id = Column(String(128), index=True, nullable=True)
    ip = Column(String(64), index=True, nullable=True)
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    contributing_events = Column(JSON, nullable=True)
