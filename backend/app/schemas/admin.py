from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class SessionInAdmin(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool
    created_at: datetime
    request_count: int
    dj_name: Optional[str] = None

class SessionListResponse(BaseModel):
    sessions: List[SessionInAdmin]
