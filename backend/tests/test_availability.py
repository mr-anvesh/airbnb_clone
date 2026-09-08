from datetime import date, timedelta

from app.bookings.pricing import calculate_price
from app.bookings.schemas import AvailabilityCheck, BookingCreate
from app.bookings.service import BookingService


def test_price_calculation():
    price = calculate_price(100.0, date(2026, 1, 1), date(2026, 1, 5))
    assert price.nights == 4
    assert price.nightly_subtotal == 400.0
    assert price.cleaning_fee == 40.0
    assert price.service_fee == 48.0
    assert price.total == 488.0


def test_check_availability_open(db, sample_listing):
    service = BookingService(db)
    data = AvailabilityCheck(
        listing_id=sample_listing.id,
        check_in=date.today() + timedelta(days=30),
        check_out=date.today() + timedelta(days=35),
    )
    available, breakdown = service.check_availability(data)
    assert available is True
    assert breakdown is not None
    assert breakdown.nights == 5


def test_check_availability_blocked(db, sample_listing, sample_guest):
    service = BookingService(db)
    check_in = date.today() + timedelta(days=30)
    check_out = date.today() + timedelta(days=35)

    create_data = BookingCreate(
        listing_id=sample_listing.id,
        check_in=check_in,
        check_out=check_out,
        guests=2,
    )
    service.create_booking(sample_guest.id, create_data)

    data = AvailabilityCheck(
        listing_id=sample_listing.id,
        check_in=check_in,
        check_out=check_out,
    )
    available, breakdown = service.check_availability(data)
    assert available is False
    assert breakdown is None
