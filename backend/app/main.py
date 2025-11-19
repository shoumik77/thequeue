from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas
from .database import Base, engine, get_db
from .utils import generate_slug
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import asyncio
import json

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TheQueue API", version="0.1.0")

# CORS - allow localhost dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}


# --- Realtime: simple per-session WS manager ---
class ConnectionManager:
    def __init__(self) -> None:
        # session_id -> set[WebSocket]
        self.rooms: dict[int, set[WebSocket]] = {}

    async def connect(self, session_id: int, websocket: WebSocket):
        await websocket.accept()
        self.rooms.setdefault(session_id, set()).add(websocket)

    def disconnect(self, session_id: int, websocket: WebSocket):
        room = self.rooms.get(session_id)
        if room and websocket in room:
            room.remove(websocket)
            if not room:
                self.rooms.pop(session_id, None)

    async def broadcast(self, session_id: int, message: dict):
        room = self.rooms.get(session_id)
        if not room:
            return
        data = json.dumps(message)
        to_remove: list[WebSocket] = []
        for ws in list(room):
            try:
                await ws.send_text(data)
            except Exception:
                to_remove.append(ws)
        for ws in to_remove:
            self.disconnect(session_id, ws)


manager = ConnectionManager()


@app.websocket("/ws/sessions/{session_id}")
async def websocket_session(session_id: int, websocket: WebSocket):
    await manager.connect(session_id, websocket)
    try:
        while True:
            # We don't expect incoming messages now; keep alive by reading
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)

# POST /sessions
@app.post("/sessions", response_model=schemas.SessionOut)
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db)):
    slug = generate_slug(db)
    session = models.Session(name=payload.name, slug=slug, is_active=True)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

# GET /sessions/{slug}
@app.get("/sessions/{slug}", response_model=schemas.SessionOut)
def get_session_by_slug(slug: str, db: Session = Depends(get_db)):
    stmt = select(models.Session).where(models.Session.slug == slug)
    session = db.execute(stmt).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

# POST /sessions/{session_id}/requests
@app.post("/sessions/{session_id}/requests", response_model=schemas.RequestOut)
def create_request(session_id: int, payload: schemas.RequestCreate, db: Session = Depends(get_db)):
    sess = db.get(models.Session, session_id)
    if not sess or not sess.is_active:
        raise HTTPException(status_code=404, detail="Session not found or inactive")
    # position: append to end (max position + 1)
    max_pos = db.query(models.Request).filter(models.Request.session_id == session_id).count()
    req = models.Request(
        session_id=session_id,
        guest_name=payload.guest_name,
        song_title=payload.song_title,
        artist=payload.artist,
        note=payload.note,
        status=models.RequestStatus.pending,
        position=max_pos + 1,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    # Broadcast new request
    try:
        data = schemas.RequestOut.model_validate(req).model_dump()
        asyncio.create_task(manager.broadcast(session_id, {"type": "request:new", "data": data}))
    except Exception:
        pass
    return req

# GET /sessions/{session_id}/requests
@app.get("/sessions/{session_id}/requests", response_model=list[schemas.RequestOut])
def list_requests(session_id: int, db: Session = Depends(get_db)):
    sess = db.get(models.Session, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    stmt = (
        select(models.Request)
        .where(models.Request.session_id == session_id)
        .order_by(models.Request.position.asc(), models.Request.created_at.asc())
    )
    rows = db.execute(stmt).scalars().all()
    return rows

# PATCH /requests/{request_id}/status
@app.patch("/requests/{request_id}/status", response_model=schemas.RequestOut)
def update_request_status(request_id: int, payload: schemas.RequestStatusUpdate, db: Session = Depends(get_db)):
    req = db.get(models.Request, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = payload.status
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

# PATCH /requests/{request_id}/position
@app.patch("/requests/{request_id}/position", response_model=schemas.RequestOut)
def update_request_position(request_id: int, payload: schemas.RequestPositionUpdate, db: Session = Depends(get_db)):
    req = db.get(models.Request, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    session_id = req.session_id
    # Load all requests in session ordered by current position
    current = (
        db.execute(
            select(models.Request).where(models.Request.session_id == session_id).order_by(models.Request.position.asc(), models.Request.created_at.asc())
        ).scalars().all()
    )
    # Clamp new position to [1, len]
    n = len(current)
    new_pos = max(1, min(payload.position, n))
    # Rebuild order: remove req, insert at new_pos-1
    others = [r for r in current if r.id != request_id]
    insert_index = max(0, min(new_pos - 1, len(others)))
    new_list = others[:insert_index] + [req] + others[insert_index:]
    # Renumber sequentially starting at 1
    for idx, r in enumerate(new_list, start=1):
        r.position = idx
        db.add(r)
    db.commit()
    db.refresh(req)
    return req
