from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.bookings.schemas import BookingCreate, BookingResponse, BookingWithListing
from app.bookings.service import BookingService
from app.dependencies import get_current_user_id, get_db

router = APIRouter(prefix="/bookings", tags=["bookings"])
me_router = APIRouter(prefix="/me", tags=["my-trips"])
host_booking_router = APIRouter(prefix="/host", tags=["host"])


@router.post("", response_model=BookingResponse, status_code=201)
def create_booking(
    data: BookingCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = BookingService(db)
    return service.create_booking(user_id, data)


@router.post(
    "/{booking_id}/cancel", response_model=BookingResponse
)
def cancel_booking(
    booking_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = BookingService(db)
    return service.cancel_booking(user_id, booking_id)


# My Trips
@me_router.get("/bookings")
def get_my_bookings(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = BookingService(db)
    bookings = service.get_guest_bookings(user_id)
    result = []
    for b in bookings:
        item = BookingWithListing.model_validate(b)
        if b.listing:
            item.listing_title = b.listing.title
            item.listing_location = b.listing.location
            if b.listing.images:
                item.listing_image = b.listing.images[0].image_url
        result.append(item)
    return result


# Host bookings
@host_booking_router.get("/bookings")
def get_host_bookings(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = BookingService(db)
    bookings = service.get_host_bookings(user_id)
    return [BookingResponse.model_validate(b) for b in bookings]
