import json
import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.auth.service import decode_token
from app.chat.schemas import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.chat.service import ChatService
from app.chat.websocket import manager
from app.dependencies import get_current_user_id, get_db
from app.database.connection import SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/conversations", response_model=list[ConversationResponse])
def get_conversations(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = ChatService(db)
    return service.get_user_conversations(user_id)


@router.post("/conversations", response_model=ConversationResponse)
def create_conversation(
    data: ConversationCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = ChatService(db)
    conv = service.get_or_create_conversation(data.listing_id, user_id)
    conversations = service.get_user_conversations(user_id)
    for c in conversations:
        if c.id == conv.id:
            return c
    return conversations[0]


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_messages(
    conversation_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    service = ChatService(db)
    return service.get_messages(conversation_id, user_id, limit, offset)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
)
def send_message(
    conversation_id: int,
    data: MessageCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = ChatService(db)
    return service.send_message(conversation_id, user_id, data.content)


@router.post("/conversations/{conversation_id}/read", status_code=204)
def mark_read(
    conversation_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = ChatService(db)
    service.mark_messages_read(conversation_id, user_id)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    user_id = decode_token(token)
    if user_id is None:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Invalid JSON"})
                )
                continue

            msg_type = data.get("type")
            if msg_type == "message":
                conversation_id = data.get("conversation_id")
                content = data.get("content", "").strip()
                if not conversation_id or not content:
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": "Missing fields"})
                    )
                    continue

                db = SessionLocal()
                try:
                    service = ChatService(db)
                    msg_resp = service.send_message(
                        conversation_id, user_id, content
                    )
                    payload = {
                        "type": "new_message",
                        "message": msg_resp.model_dump(mode="json"),
                    }

                    conv = service.repo.get_conversation_by_id(conversation_id)
                    if conv:
                        recipient_id = (
                            conv.host_id
                            if conv.guest_id == user_id
                            else conv.guest_id
                        )
                        await manager.send_to_user(recipient_id, payload)
                    await manager.send_to_user(user_id, payload)
                except Exception as e:
                    logger.error("WS message error: %s", e)
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": str(e)})
                    )
                finally:
                    db.close()

            elif msg_type == "read":
                conversation_id = data.get("conversation_id")
                if not conversation_id:
                    continue
                db = SessionLocal()
                try:
                    service = ChatService(db)
                    service.mark_messages_read(conversation_id, user_id)
                finally:
                    db.close()

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error("WebSocket error for user %d: %s", user_id, e)
        manager.disconnect(user_id, websocket)
