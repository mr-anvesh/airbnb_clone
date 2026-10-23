from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.chat.models import Conversation, Message


class ChatRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_conversation_by_id(self, conversation_id: int) -> Conversation | None:
        return (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )

    def get_conversation_by_listing_and_guest(
        self, listing_id: int, guest_id: int
    ) -> Conversation | None:
        return (
            self.db.query(Conversation)
            .filter(
                Conversation.listing_id == listing_id,
                Conversation.guest_id == guest_id,
            )
            .first()
        )

    def get_user_conversations(self, user_id: int) -> list[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(
                or_(
                    Conversation.guest_id == user_id,
                    Conversation.host_id == user_id,
                )
            )
            .order_by(Conversation.updated_at.desc())
            .all()
        )

    def create_conversation(self, conversation: Conversation) -> Conversation:
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def get_messages(
        self, conversation_id: int, limit: int = 50, offset: int = 0
    ) -> list[Message]:
        return (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def create_message(self, message: Message) -> Message:
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def mark_messages_read(self, conversation_id: int, reader_id: int) -> int:
        count = (
            self.db.query(Message)
            .filter(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != reader_id,
                    Message.is_read == False,
                )
            )
            .update({"is_read": True})
        )
        self.db.commit()
        return count

    def get_unread_count(self, conversation_id: int, user_id: int) -> int:
        return (
            self.db.query(Message)
            .filter(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != user_id,
                    Message.is_read == False,
                )
            )
            .count()
        )

    def get_last_message(self, conversation_id: int) -> Message | None:
        return (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .first()
        )
