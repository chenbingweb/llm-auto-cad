from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Session as SessionModel, Scene
from app.schemas import SessionResponse
import uuid

router = APIRouter(prefix="/api/session", tags=["session"])


@router.post("", response_model=SessionResponse)
def create_session(db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())

    session = SessionModel(id=session_id)
    db.add(session)

    scene = Scene(id=str(uuid.uuid4()), session_id=session_id)
    db.add(scene)

    db.commit()
    db.refresh(session)

    return SessionResponse(
        session_id=session.id,
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(
        session_id=session.id,
        created_at=session.created_at,
        updated_at=session.updated_at
    )