from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.models.base import Base

class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_type = Column(String(32), index=True, nullable=False) # 'SERVER', 'USER', 'SESSION', 'IP'
    source_id = Column(String(128), index=True, nullable=False)
    target_type = Column(String(32), index=True, nullable=False) # 'USER', 'SESSION', 'IP', 'RESOURCE'
    target_id = Column(String(128), index=True, nullable=False)
    relation_type = Column(String(64), nullable=False)           # 'CONNECTS_TO', 'HAS_SESSION', 'ACTIVE_AT_IP', 'ACCESSED'
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
