from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(String(36), primary_key=True)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False, index=True)
    objects = Column(JSON, default=list)
    history = Column(JSON, default=list)
    history_index = Column(Integer, default=-1)
    version = Column(Integer, default=1)

    session = relationship("Session", back_populates="scenes")