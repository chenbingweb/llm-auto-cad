from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Scene
from app.schemas import SceneSync, SceneSyncResponse, SceneResponse, UndoRedoRequest, UndoRedoResponse

router = APIRouter(prefix="/api/scene", tags=["scene"])


@router.post("/sync", response_model=SceneSyncResponse)
def sync_scene(data: SceneSync, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.session_id == data.session_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    scene.objects = data.scene_objects
    scene.version += 1

    db.commit()

    return SceneSyncResponse(success=True, scene_version=scene.version)


@router.get("/{session_id}", response_model=SceneResponse)
def get_scene(session_id: str, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.session_id == session_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    return SceneResponse(
        scene_objects=scene.objects or [],
        history=scene.history or [],
        history_index=scene.history_index or -1
    )


@router.post("/undo", response_model=UndoRedoResponse)
def undo_scene(data: UndoRedoRequest, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.session_id == data.session_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    history = scene.history or []
    history_index = scene.history_index

    if history_index <= 0:
        return UndoRedoResponse(previous_state=None)

    new_index = history_index - 1
    previous_state = {
        "objects": history[new_index] if new_index < len(history) else [],
        "history_index": new_index
    }

    scene.history_index = new_index
    scene.objects = history[new_index] if new_index >= 0 else []
    db.commit()

    return UndoRedoResponse(previous_state=previous_state)


@router.post("/redo", response_model=UndoRedoResponse)
def redo_scene(data: UndoRedoRequest, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.session_id == data.session_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    history = scene.history or []
    history_index = scene.history_index

    if history_index >= len(history) - 1:
        return UndoRedoResponse(next_state=None)

    new_index = history_index + 1
    next_state = {
        "objects": history[new_index] if new_index < len(history) else [],
        "history_index": new_index
    }

    scene.history_index = new_index
    scene.objects = history[new_index]
    db.commit()

    return UndoRedoResponse(next_state=next_state)