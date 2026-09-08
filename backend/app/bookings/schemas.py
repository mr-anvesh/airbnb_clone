from datetime import date, datetime

from pydantic import BaseModel, Field

from app.bookings.models import BookingStatus


class BookingCreate(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guests: int = Field(gt=0)


class PriceBreakdown(BaseModel):
    nightly_price: float
    nights: int
    nightly_subtotal: float
    cleaning_fee: float
    service_fee: float
    total: float


class BookingResponse(BaseModel):
    id: int
    listing_id: int
    guest_id: int
    check_in: date
    check_out: date
    guests: int
    nightly_price: float
    nights: int
    cleaning_fee: float
    service_fee: float
    total_price: float
    status: BookingStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingWithListing(BookingResponse):
    listing_title: str = ""
    listing_location: str = ""
    listing_image: str | None = None


class AvailabilityCheck(BaseModel):
    listing_id: int
    check_in: date
    check_out: date


class AvailabilityResponse(BaseModel):
    available: bool
    price_breakdown: PriceBreakdown | None = None
