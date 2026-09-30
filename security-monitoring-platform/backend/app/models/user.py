from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    department = Column(String(64), nullable=True)
    role = Column(String(64), nullable=True)
    status = Column(String(32), default="active", nullable=False)  # 'active', 'inactive', 'suspicious'
    risk_score = Column(Integer, default=0, nullable=False)        # 0 to 100
    first_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    failed_login_count = Column(Integer, default=0, nullable=False)
