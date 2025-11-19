from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas
from .database import Base, engine, get_db
from .utils import generate_slug
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

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
