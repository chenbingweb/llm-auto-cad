from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    scenes = relationship("Scene", back_populates="session")