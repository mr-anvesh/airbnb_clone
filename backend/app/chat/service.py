from datetime import datetime

from sqlalchemy.orm import Session

from app.chat.models import Conversation, Message
from app.chat.repository import ChatRepository
from app.chat.schemas import ConversationResponse, MessageResponse
from app.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from app.listings.models import Listing
from app.users.models import User


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ChatRepository(db)

    def get_or_create_conversation(
        self, listing_id: int, user_id: int
    ) -> Conversation:
        listing = self.db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            raise NotFoundException("NOT_FOUND", "Listing not found")

        if listing.host_id == user_id:
            raise BadRequestException(
                "BAD_REQUEST", "Cannot start a conversation with yourself"
            )

        existing = self.repo.get_conversation_by_listing_and_guest(listing_id, user_id)
        if existing:
            return existing

        conversation = Conversation(
            listing_id=listing_id,
            guest_id=user_id,
            host_id=listing.host_id,
        )
        return self.repo.create_conversation(conversation)

    def get_user_conversations(self, user_id: int) -> list[ConversationResponse]:
        conversations = self.repo.get_user_conversations(user_id)
        results = []
        for conv in conversations:
            is_guest = conv.guest_id == user_id
            other_user = conv.host if is_guest else conv.guest
            last_msg = self.repo.get_last_message(conv.id)
            unread = self.repo.get_unread_count(conv.id, user_id)

            results.append(
                ConversationResponse(
                    id=conv.id,
                    listing_id=conv.listing_id,
                    guest_id=conv.guest_id,
                    host_id=conv.host_id,
                    listing_title=conv.listing.title if conv.listing else "Deleted listing",
                    other_user_name=other_user.name if other_user else "Unknown",
                    other_user_avatar=other_user.avatar_url if other_user else None,
                    last_message=last_msg.content if last_msg else None,
                    last_message_at=last_msg.created_at if last_msg else None,
                    unread_count=unread,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                )
            )
        return results

    def _check_access(self, conversation: Conversation, user_id: int) -> None:
        if conversation.guest_id != user_id and conversation.host_id != user_id:
            raise ForbiddenException("FORBIDDEN", "Access denied to this conversation")

    def get_messages(
        self, conversation_id: int, user_id: int, limit: int = 50, offset: int = 0
    ) -> list[MessageResponse]:
        conversation = self.repo.get_conversation_by_id(conversation_id)
        if not conversation:
            raise NotFoundException("NOT_FOUND", "Conversation not found")
        self._check_access(conversation, user_id)

        messages = self.repo.get_messages(conversation_id, limit, offset)
        return [
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_id=m.sender_id,
                sender_name=m.sender.name if m.sender else "Unknown",
                sender_avatar=m.sender.avatar_url if m.sender else None,
                content=m.content,
                is_read=m.is_read,
                created_at=m.created_at,
            )
            for m in messages
        ]

    def send_message(
        self, conversation_id: int, sender_id: int, content: str
    ) -> MessageResponse:
        conversation = self.repo.get_conversation_by_id(conversation_id)
        if not conversation:
            raise NotFoundException("NOT_FOUND", "Conversation not found")
        self._check_access(conversation, sender_id)

        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
        )
        message = self.repo.create_message(message)

        conversation.updated_at = datetime.utcnow()
        self.db.commit()

        sender = self.db.query(User).filter(User.id == sender_id).first()
        return MessageResponse(
            id=message.id,
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            sender_name=sender.name if sender else "Unknown",
            sender_avatar=sender.avatar_url if sender else None,
            content=message.content,
            is_read=message.is_read,
            created_at=message.created_at,
        )

    def mark_messages_read(self, conversation_id: int, user_id: int) -> int:
        conversation = self.repo.get_conversation_by_id(conversation_id)
        if not conversation:
            raise NotFoundException("NOT_FOUND", "Conversation not found")
        self._check_access(conversation, user_id)
        return self.repo.mark_messages_read(conversation_id, user_id)
