# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Text-to-3D Modeling Application — an AI-powered 3D modeling tool that converts natural language descriptions into 3D geometry using OpenGeometry SDK.

- **Frontend**: Vue.js + Three.js + OpenGeometry JS SDK
- **Backend**: FastAPI (Python) + SQLAlchemy + MySQL
- **AI**: MiniMax API for natural language intent parsing

## Architecture

```
Browser (Vue.js)                    Python Backend (FastAPI)
┌─────────────────┐                 ┌─────────────────────────┐
│  ChatPanel      │──── HTTP ────▶  │  /api/chat              │
│  Canvas3D       │                 │  /api/session           │
│  CommandEngine  │◀─── JSON ─────  │  /api/scene             │
│  OpenGeometry   │                 │         │               │
└─────────────────┘                 │         ▼               │
                                    │    MiniMax API          │
                                    │    MySQL                │
                                    └─────────────────────────┘
```

## Commands

### Frontend (Vue.js)
```bash
cd frontend
npm install
npm run dev        # Development server
npm run build      # Production build
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head          # Run migrations
uvicorn app.main:app --reload # Development server
```

### Database
```bash
cd backend
alembic revision --autogenerate -m "description"  # Create migration
alembic upgrade head                          # Apply migrations
alembic downgrade -1                          # Rollback
```

## Key Design Decisions

1. **JSON Command Pattern**: MiniMax returns structured JSON commands, not direct 3D data. Frontend parses and executes via OpenGeometry.
2. **Frontend 3D Generation**: OpenGeometry JS SDK runs entirely in browser for real-time feedback.
3. **Backend AI Proxy**: Backend handles MiniMax API calls and scene persistence; does not generate 3D.
4. **Hybrid Session Storage**: Active session state in Pinia store, synced to MySQL for persistence.

## Design Document

Full design specification: `docs/superpowers/specs/2026-06-29-text-to-3d-design.md`