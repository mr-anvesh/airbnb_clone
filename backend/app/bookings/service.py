from sqlalchemy.orm import Session

from app.bookings.models import Booking, BookingStatus
from app.bookings.pricing import calculate_price
from app.bookings.repository import BookingRepository
from app.bookings.schemas import AvailabilityCheck, BookingCreate, PriceBreakdown
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
import logging

from app.listings.repository import ListingRepository
from app.messaging.publisher import event_publisher
from app.messaging.events import DomainEvent, EventType

logger = logging.getLogger(__name__)


class BookingService:
    def __init__(self, db: Session):
        self.db = db
        self.booking_repo = BookingRepository(db)
        self.listing_repo = ListingRepository(db)

    def create_booking(
        self, guest_id: int, data: BookingCreate
    ) -> Booking:
        listing = self.listing_repo.get_by_id(data.listing_id)
        if not listing:
            raise NotFoundException(
                "LISTING_NOT_FOUND", "Listing not found"
            )

        if data.check_out <= data.check_in:
            raise BadRequestException(
                "INVALID_DATE_RANGE",
                "Check-out must be after check-in",
            )

        if data.guests > listing.max_guests:
            raise BadRequestException(
                "INVALID_GUEST_COUNT",
                f"Maximum {listing.max_guests} guests allowed",
            )

        if listing.host_id == guest_id:
            raise BadRequestException(
                "BAD_REQUEST", "Cannot book your own listing"
            )

        price = calculate_price(
            listing.price_per_night, data.check_in, data.check_out
        )

        # Transactional: availability check + insert in same transaction
        if self.booking_repo.has_conflict(
            data.listing_id, data.check_in, data.check_out
        ):
            raise ConflictException(
                "LISTING_NOT_AVAILABLE",
                "The selected dates are no longer available",
            )

        booking = Booking(
            listing_id=data.listing_id,
            guest_id=guest_id,
            check_in=data.check_in,
            check_out=data.check_out,
            guests=data.guests,
            nightly_price=price.nightly_price,
            nights=price.nights,
            cleaning_fee=price.cleaning_fee,
            service_fee=price.service_fee,
            total_price=price.total,
            status=BookingStatus.CONFIRMED,
        )
        self.db.add(booking)
        self.db.commit()
        self.db.refresh(booking)

        # Publish event — worker creates host notification asynchronously
        try:
            event_publisher.publish(
                DomainEvent(
                    event_type=EventType.BOOKING_CREATED,
                    data={
                        "booking_id": booking.id,
                        "listing_id": booking.listing_id,
                        "listing_title": listing.title,
                        "host_id": listing.host_id,
                        "guest_id": guest_id,
                        "check_in": str(data.check_in),
                        "check_out": str(data.check_out),
                        "nights": price.nights,
                        "total": price.total,
                    },
                )
            )
        except Exception as e:
            logger.warning("Failed to publish BOOKING_CREATED event: %s", e)

        return booking

    def cancel_booking(
        self, user_id: int, booking_id: int
    ) -> Booking:
        booking = self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundException(
                "BOOKING_NOT_FOUND", "Booking not found"
            )
        if booking.guest_id != user_id:
            raise ForbiddenException(
                "FORBIDDEN", "You can only cancel your own bookings"
            )
        if booking.status != BookingStatus.CONFIRMED:
            raise BadRequestException(
                "BAD_REQUEST",
                "Only confirmed bookings can be cancelled",
            )

        booking.status = BookingStatus.CANCELLED
        self.db.commit()
        self.db.refresh(booking)

        # Publish event — worker creates host notification asynchronously
        cancelled_listing = self.listing_repo.get_by_id(booking.listing_id)
        try:
            event_publisher.publish(
                DomainEvent(
                    event_type=EventType.BOOKING_CANCELLED,
                    data={
                        "booking_id": booking.id,
                        "listing_id": booking.listing_id,
                        "listing_title": cancelled_listing.title if cancelled_listing else "",
                        "host_id": cancelled_listing.host_id if cancelled_listing else 0,
                        "guest_id": booking.guest_id,
                        "check_in": str(booking.check_in),
                        "check_out": str(booking.check_out),
                    },
                )
            )
        except Exception as e:
            logger.warning("Failed to publish BOOKING_CANCELLED event: %s", e)

        return booking

    def get_booking(self, booking_id: int) -> Booking:
        booking = self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundException(
                "BOOKING_NOT_FOUND", "Booking not found"
            )
        return booking

    def get_guest_bookings(self, guest_id: int) -> list[Booking]:
        return self.booking_repo.get_by_guest(guest_id)

    def get_host_bookings(self, host_id: int) -> list[Booking]:
        return self.booking_repo.get_by_host(host_id)

    def get_listing_bookings(
        self, listing_id: int
    ) -> list[Booking]:
        return self.booking_repo.get_by_listing(listing_id)

    def check_availability(
        self, data: AvailabilityCheck
    ) -> tuple[bool, PriceBreakdown | None]:
        listing = self.listing_repo.get_by_id(data.listing_id)
        if not listing:
            raise NotFoundException(
                "LISTING_NOT_FOUND", "Listing not found"
            )

        if data.check_out <= data.check_in:
            raise BadRequestException(
                "INVALID_DATE_RANGE",
                "Check-out must be after check-in",
            )

        available = not self.booking_repo.has_conflict(
            data.listing_id, data.check_in, data.check_out
        )

        price_breakdown = None
        if available:
            price = calculate_price(
                listing.price_per_night, data.check_in, data.check_out
            )
            price_breakdown = PriceBreakdown(
                nightly_price=price.nightly_price,
                nights=price.nights,
                nightly_subtotal=price.nightly_subtotal,
                cleaning_fee=price.cleaning_fee,
                service_fee=price.service_fee,
                total=price.total,
            )

        return available, price_breakdown

    def get_confirmed_bookings_for_listing(
        self, listing_id: int
    ) -> list[Booking]:
        return self.booking_repo.get_confirmed_for_listing(listing_id)
