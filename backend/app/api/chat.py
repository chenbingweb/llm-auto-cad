from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas import ChatRequest, ChatResponse
from app.services.minimax import minimax_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    db: Session = Depends(get_db)
) -> ChatResponse:
    result = await minimax_service.chat(
        user_input=data.user_input,
        scene_context=data.scene_context
    )

    return ChatResponse(
        command=result.get("command"),
        description=result.get("description", "")
    )