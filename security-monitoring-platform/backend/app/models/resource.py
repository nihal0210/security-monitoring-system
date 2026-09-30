from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from app.models.base import Base

class Resource(Base):
    __tablename__ = "resources"

    resource_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(256), unique=True, index=True, nullable=False)
    classification = Column(String(64), default="INTERNAL", nullable=False)
    access_count = Column(Integer, default=1, nullable=False)
    last_accessed = Column(DateTime, default=datetime.utcnow, nullable=False)
