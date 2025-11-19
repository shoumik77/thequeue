from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from .models import RequestStatus


class SessionCreate(BaseModel):
    name: str


class SessionOut(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool
    created_at: datetime
    ends_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RequestCreate(BaseModel):
    song_title: str
    artist: Optional[str] = None
    guest_name: Optional[str] = None
    note: Optional[str] = None


class RequestOut(BaseModel):
    id: int
    session_id: int
    guest_name: Optional[str]
    song_title: str
    artist: Optional[str]
    note: Optional[str]
    status: RequestStatus
    position: int
    tip_amount: Optional[float] = None
    votes: int
    created_at: datetime

    class Config:
        from_attributes = True


class RequestStatusUpdate(BaseModel):
    status: RequestStatus


class RequestPositionUpdate(BaseModel):
    position: int
