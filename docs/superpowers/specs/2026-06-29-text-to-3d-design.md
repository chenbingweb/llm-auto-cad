# Text-to-3D Modeling Application Design

> Design for an AI-powered 3D modeling tool that converts natural language descriptions into 3D geometry.

## Overview

A browser-based 3D modeling application for professional designers. Users describe what they want in natural language, and an AI assistant (MiniMax) generates 3D geometry in real-time via OpenGeometry SDK.

## User Profile

- **Target Users**: Professional designers (architects, mechanical engineers)
- **Use Case**: Natural language-assisted rapid design iteration
- **Environment**: Browser + Backend API

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Vue.js)                     │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐  │
│  │   ChatPanel  │───▶│  Backend API │   │  3D Canvas │  │
│  │              │    │  /api/chat   │   │(Three.js)  │  │
│  └──────┬───────┘    └──────────────┘   └─────┬──────┘  │
│         │                   │                 │         │
│         └───────────────────┼─────────────────┘         │
│                             ▼                           │
│                    ┌──────────────┐                     │
│                    │CommandEngine │                     │
│                    │ (JSON Parser)│                     │
│                    └──────┬───────┘                     │
│                           ▼                             │
│                    ┌──────────────┐                     │
│                    │ OpenGeometry │                     │
│                    │   JS SDK     │                     │
│                    └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   Python Backend (FastAPI)              │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐  │
│  │  Session     │───▶│  MiniMax API │   │   MySQL    │  │
│  │  /api/session│    │  (AI Parse)  │   │  (Storage) │  │
│  └──────────────┘    └──────────────┘   └────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Flow:**
1. User inputs natural language in chat panel
2. Frontend sends to backend `/api/chat`
3. Backend calls MiniMax API, returns JSON command
4. Frontend command engine parses command, calls OpenGeometry JS SDK
5. Frontend syncs result to backend `/api/scene/sync`

### Frontend Responsibilities
- AI: Call backend API
- 3D Generation: OpenGeometry JS SDK
- Scene Rendering: Three.js
- State Management: Pinia

### Backend Responsibilities
- AI: Call MiniMax API
- Session Management: Session CRUD
- Data Persistence: MySQL

## Core Modules

### Frontend (Vue.js)
| Module | Responsibility |
|--------|----------------|
| `ChatPanel` | Dialog input, message display, command history |
| `Canvas3D` | Three.js rendering, object selection, transform controls |
| `CommandEngine` | Parse MiniMax JSON commands, translate to OpenGeometry calls |
| `SceneManager` | Manage scene objects, layers, undo/redo |
| `MiniMaxService` | Communicate with backend API |
| `ExportManager` | Handle STL/STEP/IFC export |

### Backend (FastAPI)
| Module | Responsibility |
|--------|----------------|
| `chat` | Handle chat API, call MiniMax |
| `session` | Session CRUD operations |
| `scene` | Scene persistence, sync, undo/redo |
| `models` | SQLAlchemy models |
| `schemas` | Pydantic schemas |

## JSON Command Format

```json
{
  "action": "create",
  "shape": "cylinder",
  "params": {
    "radius": 1.5,
    "height": 3.0,
    "segments": 32
  },
  "transform": {
    "position": [0, 0, 0],
    "rotation": [0, 0, 0],
    "scale": [1, 1, 1]
  },
  "material": {
    "color": "#ff8800",
    "opacity": 1.0
  },
  "description": "Created an orange cylinder with radius 1.5 and height 3"
}
```

### Supported Actions

| Action | Description |
|--------|-------------|
| `create` | Create new geometry |
| `modify` | Modify selected object |
| `delete` | Delete object |
| `transform` | Transform object (move/rotate/scale) |
| `boolean` | Boolean operations (union/subtract/intersect) |
| `export` | Export scene |

### Supported Shapes

- `cuboid` - Rectangular box
- `cylinder` - Cylinder
- `sphere` - Sphere
- `wedge` - Triangular prism
- `polygon` - 2D polygon with holes
- `arc` - Circular arc
- `curve` - Curve via control points
- `line` - Simple line
- `polyline` - Connected line segments
- `rectangle` - Rectangle

## API Design

### Chat
```
POST /api/chat
  Body: { user_input: str, scene_context: list, session_id: str }
  Response: { command: {...}, description: str }
```

### Session
```
POST /api/session
  Body: {}
  Response: { session_id: str }

GET /api/session/{session_id}
  Response: { session_id: str, created_at: str, updated_at: str }
```

### Scene
```
POST /api/scene/sync
  Body: { session_id: str, scene_objects: list }
  Response: { success: bool, scene_version: int }

GET /api/scene/{session_id}
  Response: { scene_objects: list, history: list, history_index: int }

POST /api/scene/undo
  Body: { session_id: str }
  Response: { previous_state: {...} }

POST /api/scene/redo
  Body: { session_id: str }
  Response: { next_state: {...} }
```

## Database Schema

### Sessions Table
```sql
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Scenes Table
```sql
CREATE TABLE scenes (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36),
  objects JSON,
  history JSON,
  history_index INT,
  version INT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Vue.js + Vite |
| 3D Rendering | Three.js + OpenGeometry JS SDK |
| State Management | Pinia |
| Backend Framework | FastAPI (Python) |
| ORM | SQLAlchemy |
| Database Migrations | Alembic |
| Database | MySQL |
| AI | MiniMax API |

## File Structure

### Frontend
```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatPanel.vue
│   │   ├── Canvas3D.vue
│   │   ├── ObjectList.vue
│   │   ├── TransformControls.vue
│   │   └── ExportDialog.vue
│   ├── services/
│   │   ├── api.js
│   │   ├── CommandEngine.js
│   │   └── ExportManager.js
│   ├── stores/
│   │   └── scene.js
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
└── vite.config.js
```

### Backend
```
backend/
├── app/
│   ├── api/
│   │   ├── chat.py
│   │   ├── session.py
│   │   └── scene.py
│   ├── models/
│   │   ├── session.py
│   │   └── scene.py
│   ├── schemas/
│   │   ├── chat.py
│   │   ├── session.py
│   │   └── scene.py
│   ├── services/
│   │   └── minimax.py
│   ├── core/
│   │   ├── database.py
│   │   └── config.py
│   └── main.py
├── alembic/
│   ├── versions/
│   └── env.py
├── alembic.ini
├── requirements.txt
└── main.py
```

## Interaction Design

### Chat Panel
- Natural language input
- AI responses with operation confirmation
- Error messages with suggestions

### 3D Canvas
- Orbit controls (rotate/zoom/pan)
- Object selection (click to select)
- Transform gizmo (move/rotate/scale)

### Object Operations
- **Select**: Click 3D object or select from object list
- **Transform**: Drag gizmo or input precise values
- **Delete**: Select and press Delete, or say "delete that cylinder"
- **Modify**: Select and describe changes in natural language

### Undo/Redo
- Every operation recorded in history stack
- Ctrl+Z to undo, Ctrl+Shift+Z to redo
- History synced to backend for persistence

## Export

Using OpenGeometry SDK:
- **STL** - Binary STL export
- **STEP** - STEP Part 21 export
- **IFC** - IFC4 export (experimental)
- **PDF** - 2D projection to vector PDF