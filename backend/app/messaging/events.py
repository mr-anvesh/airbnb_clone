import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EventType(str, enum.Enum):
    USER_CREATED = "UserCreated"
    LISTING_CREATED = "ListingCreated"
    LISTING_UPDATED = "ListingUpdated"
    LISTING_DELETED = "ListingDeleted"
    BOOKING_CREATED = "BookingCreated"
    BOOKING_CANCELLED = "BookingCancelled"
    BOOKING_COMPLETED = "BookingCompleted"
    REVIEW_CREATED = "ReviewCreated"
    WISHLIST_UPDATED = "WishlistUpdated"


class DomainEvent(BaseModel):
    event_type: EventType
    event_id: str = Field(
        default_factory=lambda: str(uuid.uuid4())
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: dict = {}
