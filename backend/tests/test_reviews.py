from datetime import date, timedelta

import pytest

from app.bookings.models import Booking, BookingStatus
from app.core.exceptions import BadRequestException
from app.reviews.schemas import ReviewCreate
from app.reviews.service import ReviewService


def test_create_review(db, sample_listing, sample_guest):
    booking = Booking(
        listing_id=sample_listing.id,
        guest_id=sample_guest.id,
        check_in=date.today() - timedelta(days=10),
        check_out=date.today() - timedelta(days=5),
        guests=2,
        nightly_price=100,
        nights=5,
        cleaning_fee=50,
        service_fee=60,
        total_price=610,
        status=BookingStatus.COMPLETED,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    service = ReviewService(db)
    data = ReviewCreate(booking_id=booking.id, rating=5, comment="Great stay!")
    review = service.create_review(
        sample_guest.id, sample_listing.id, data
    )
    assert review.rating == 5
    assert review.comment == "Great stay!"


def test_duplicate_review(db, sample_listing, sample_guest):
    booking = Booking(
        listing_id=sample_listing.id,
        guest_id=sample_guest.id,
        check_in=date.today() - timedelta(days=10),
        check_out=date.today() - timedelta(days=5),
        guests=2,
        nightly_price=100,
        nights=5,
        cleaning_fee=50,
        service_fee=60,
        total_price=610,
        status=BookingStatus.COMPLETED,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    service = ReviewService(db)
    data = ReviewCreate(booking_id=booking.id, rating=5, comment="Great stay!")
    service.create_review(sample_guest.id, sample_listing.id, data)

    with pytest.raises(BadRequestException):
        service.create_review(sample_guest.id, sample_listing.id, data)
