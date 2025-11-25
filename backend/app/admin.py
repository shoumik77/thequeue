from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from . import models, schemas
from .database import get_db
import os

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()

# Simple token-based auth
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = os.getenv("ADMIN_TOKEN")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin authentication not configured"
        )
    if credentials.credentials != token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return True

@router.get("/sessions", response_model=schemas.admin.SessionListResponse)
async def list_sessions(
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_token)
):
    # Get all sessions with request count and DJ name
    sessions = db.execute(
        select(
            models.Session,
            func.count(models.Request.id).label('request_count')
        )
        .join(models.Session.requests, isouter=True)
        .join(models.User, models.Session.dj_id == models.User.id, isouter=True)
        .group_by(models.Session.id)
    ).all()
    
    return {
        "sessions": [
            {
                "id": session.id,
                "name": session.name,
                "slug": session.slug,
                "is_active": session.is_active,
                "created_at": session.created_at,
                "request_count": request_count,
                "dj_name": session.dj.name if session.dj else None
            }
            for session, request_count in sessions
        ]
    }

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def end_session(
    session_id: int,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_token)
):
    # Mark session as inactive
    session = db.get(models.Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_active = False
    db.commit()
    return None
