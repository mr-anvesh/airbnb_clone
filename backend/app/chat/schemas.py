from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    listing_id: int


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    sender_avatar: str | None = None
    content: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: int
    listing_id: int
    guest_id: int
    host_id: int
    listing_title: str
    other_user_name: str
    other_user_avatar: str | None = None
    last_message: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
