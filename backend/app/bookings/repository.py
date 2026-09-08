from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.bookings.models import Booking, BookingStatus


class BookingRepository:
    def __init__(self, db: Session):
        self.db = db

    def has_conflict(
        self, listing_id: int, check_in: date, check_out: date
    ) -> bool:
        return (
            self.db.query(Booking)
            .filter(
                Booking.listing_id == listing_id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.check_in < check_out,
                Booking.check_out > check_in,
            )
            .first()
            is not None
        )

    def get_by_id(self, booking_id: int) -> Booking | None:
        return (
            self.db.query(Booking)
            .options(joinedload(Booking.listing))
            .filter(Booking.id == booking_id)
            .first()
        )

    def get_by_guest(self, guest_id: int) -> list[Booking]:
        return (
            self.db.query(Booking)
            .options(joinedload(Booking.listing))
            .filter(Booking.guest_id == guest_id)
            .order_by(Booking.created_at.desc())
            .all()
        )

    def get_by_listing(self, listing_id: int) -> list[Booking]:
        return (
            self.db.query(Booking)
            .options(joinedload(Booking.guest))
            .filter(Booking.listing_id == listing_id)
            .order_by(Booking.created_at.desc())
            .all()
        )

    def get_by_host(self, host_id: int) -> list[Booking]:
        from app.listings.models import Listing

        return (
            self.db.query(Booking)
            .join(Listing)
            .options(
                joinedload(Booking.listing),
                joinedload(Booking.guest),
            )
            .filter(Listing.host_id == host_id)
            .order_by(Booking.created_at.desc())
            .all()
        )

    def get_confirmed_for_listing(self, listing_id: int) -> list[Booking]:
        return (
            self.db.query(Booking)
            .filter(
                Booking.listing_id == listing_id,
                Booking.status == BookingStatus.CONFIRMED,
            )
            .all()
        )
