from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str


class ReviewResponse(BaseModel):
    id: int
    listing_id: int
    user_id: int
    booking_id: int
    rating: int
    comment: str
    created_at: datetime
    user_name: str = ""
    user_avatar: str | None = None

    model_config = {"from_attributes": True}
