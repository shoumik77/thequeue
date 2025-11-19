from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SAEnum, Numeric
from sqlalchemy.orm import relationship
from .database import Base


class RequestStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    playing = "playing"
    done = "done"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("Session", back_populates="dj")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    dj_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    ends_at = Column(DateTime, nullable=True)

    dj = relationship("User", back_populates="sessions")
    requests = relationship("Request", back_populates="session", cascade="all, delete-orphan")


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    guest_name = Column(String, nullable=True)
    song_title = Column(String, nullable=False)
    artist = Column(String, nullable=True)
    note = Column(String, nullable=True)
    status = Column(SAEnum(RequestStatus), default=RequestStatus.pending, nullable=False)
    position = Column(Integer, nullable=False, default=1)
    tip_amount = Column(Numeric, nullable=True)
    votes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="requests")
