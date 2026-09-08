from datetime import datetime

from pydantic import BaseModel


class WishlistResponse(BaseModel):
    id: int
    user_id: int
    listing_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class WishlistWithListing(WishlistResponse):
    listing_title: str = ""
    listing_location: str = ""
    listing_price: float = 0.0
    listing_rating: float = 0.0
    listing_image: str | None = None
