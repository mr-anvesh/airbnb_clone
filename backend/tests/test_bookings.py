from datetime import date, timedelta

import pytest

from app.bookings.models import BookingStatus
from app.bookings.schemas import BookingCreate
from app.bookings.service import BookingService
from app.core.exceptions import BadRequestException, ConflictException
from app.users.models import User, UserRole


def test_create_booking(db, sample_listing, sample_guest):
    service = BookingService(db)
    data = BookingCreate(
        listing_id=sample_listing.id,
        check_in=date.today() + timedelta(days=10),
        check_out=date.today() + timedelta(days=15),
        guests=2,
    )
    booking = service.create_booking(sample_guest.id, data)
    assert booking.status == BookingStatus.CONFIRMED
    assert booking.nights == 5
    assert booking.total_price > 0


def test_prevent_overlapping_booking(db, sample_listing, sample_guest):
    service = BookingService(db)
    check_in = date.today() + timedelta(days=10)
    check_out = date.today() + timedelta(days=15)
    data = BookingCreate(
        listing_id=sample_listing.id,
        check_in=check_in,
        check_out=check_out,
        guests=2,
    )
    service.create_booking(sample_guest.id, data)

    guest2 = User(name="Guest 2", email="guest2@test.com", role=UserRole.GUEST)
    db.add(guest2)
    db.commit()
    db.refresh(guest2)

    overlap_data = BookingCreate(
        listing_id=sample_listing.id,
        check_in=check_in + timedelta(days=2),
        check_out=check_out + timedelta(days=2),
        guests=2,
    )
    with pytest.raises(ConflictException):
        service.create_booking(guest2.id, overlap_data)


def test_cancel_booking(db, sample_listing, sample_guest):
    service = BookingService(db)
    data = BookingCreate(
        listing_id=sample_listing.id,
        check_in=date.today() + timedelta(days=20),
        check_out=date.today() + timedelta(days=25),
        guests=2,
    )
    booking = service.create_booking(sample_guest.id, data)
    cancelled = service.cancel_booking(sample_guest.id, booking.id)
    assert cancelled.status == BookingStatus.CANCELLED


def test_invalid_date_range(db, sample_listing, sample_guest):
    service = BookingService(db)
    data = BookingCreate(
        listing_id=sample_listing.id,
        check_in=date.today() + timedelta(days=15),
        check_out=date.today() + timedelta(days=10),
        guests=2,
    )
    with pytest.raises(BadRequestException):
        service.create_booking(sample_guest.id, data)


def test_invalid_guest_count(db, sample_listing, sample_guest):
    service = BookingService(db)
    data = BookingCreate(
        listing_id=sample_listing.id,
        check_in=date.today() + timedelta(days=10),
        check_out=date.today() + timedelta(days=15),
        guests=100,
    )
    with pytest.raises(BadRequestException):
        service.create_booking(sample_guest.id, data)
