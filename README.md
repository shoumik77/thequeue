# TheQueue (Phase 1)

Minimal MVP for a DJ request queue.

## Backend (FastAPI + SQLite)

- Location: `backend/`
- Install deps:

```bash
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

- Run dev server (from `backend/`):

```bash
uvicorn app.main:app --reload --port 8000
```

- Health check: `GET http://localhost:8000/health`
- Core endpoints:
  - `POST /sessions` -> create session `{ name }`
  - `GET /sessions/{slug}` -> get session by slug
  - `POST /sessions/{id}/requests` -> create request
  - `GET /sessions/{id}/requests` -> list requests

SQLite file is `thequeue.db` created in `backend/` directory.

## Frontend (Vite + React + TS)

- Location: `frontend/`
- Install deps:

```bash
cd frontend
npm install
```

- Run dev server:

```bash
npm run dev
```

- Pages:
  - `/` Home
  - `/dj` DJ Dashboard (create a session, copy audience link, refresh to see requests)
  - `/s/:slug` Audience page (submit requests)

Backend CORS allows `http://localhost:5173` by default.

## Config

- Frontend can override API base with `.env`:

```
VITE_API_BASE=http://localhost:8000
```

## Next steps

- Add QR code rendering on DJ dashboard.
- Add request status updates and drag-drop ordering.
- Add polling or realtime websockets.
