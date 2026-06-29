from pydantic import BaseModel
from typing import List, Optional


class ChatRequest(BaseModel):
    user_input: str
    scene_context: List[dict]
    session_id: str


class ChatCommand(BaseModel):
    action: str
    shape: Optional[str] = None
    params: Optional[dict] = None
    transform: Optional[dict] = None
    material: Optional[dict] = None
    description: Optional[str] = None
    id: Optional[str] = None
    ids: Optional[List[str]] = None
    operation: Optional[str] = None
    format: Optional[str] = None
    options: Optional[dict] = None


class ChatResponse(BaseModel):
    command: Optional[ChatCommand] = None
    description: str