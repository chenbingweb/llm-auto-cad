from pydantic import BaseModel
from typing import List, Any, Optional


class SceneSync(BaseModel):
    session_id: str
    scene_objects: List[dict]


class SceneSyncResponse(BaseModel):
    success: bool
    scene_version: int


class SceneResponse(BaseModel):
    scene_objects: List[dict]
    history: List[dict]
    history_index: int


class UndoRedoRequest(BaseModel):
    session_id: str


class UndoRedoResponse(BaseModel):
    previous_state: Optional[dict] = None
    next_state: Optional[dict] = None