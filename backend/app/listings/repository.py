from datetime import date

from sqlalchemy.orm import Session, selectinload, joinedload

from app.bookings.models import Booking, BookingStatus
from app.listings.models import Amenity, Listing, ListingImage


class ListingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, listing_id: int) -> Listing | None:
        return (
            self.db.query(Listing)
            .options(
                selectinload(Listing.images),
                selectinload(Listing.amenities),
                joinedload(Listing.host),
            )
            .filter(Listing.id == listing_id)
            .first()
        )

    def search(
        self,
        location: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        property_type: str | None = None,
        guests: int | None = None,
        check_in: date | None = None,
        check_out: date | None = None,
        amenity_ids: list[int] | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Listing], int]:
        query = self.db.query(Listing)

        if location:
            query = query.filter(Listing.location.ilike(f"%{location}%"))
        if min_price is not None:
            query = query.filter(Listing.price_per_night >= min_price)
        if max_price is not None:
            query = query.filter(Listing.price_per_night <= max_price)
        if property_type:
            query = query.filter(Listing.property_type == property_type)
        if guests:
            query = query.filter(Listing.max_guests >= guests)
        if amenity_ids:
            for aid in amenity_ids:
                query = query.filter(
                    Listing.amenities.any(Amenity.id == aid)
                )
        if check_in and check_out:
            conflicting = (
                self.db.query(Booking.listing_id)
                .filter(
                    Booking.status == BookingStatus.CONFIRMED,
                    Booking.check_in < check_out,
                    Booking.check_out > check_in,
                )
                .subquery()
            )
            query = query.filter(
                ~Listing.id.in_(
                    self.db.query(conflicting.c.listing_id)
                )
            )

        total = query.count()
        items = (
            query.options(selectinload(Listing.images))
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    def get_by_host(self, host_id: int) -> list[Listing]:
        return (
            self.db.query(Listing)
            .options(selectinload(Listing.images))
            .filter(Listing.host_id == host_id)
            .all()
        )

    def create(self, listing: Listing) -> Listing:
        self.db.add(listing)
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def update(self, listing: Listing) -> Listing:
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def delete(self, listing: Listing) -> None:
        self.db.delete(listing)
        self.db.commit()

    def get_amenities_by_ids(self, ids: list[int]) -> list[Amenity]:
        return self.db.query(Amenity).filter(Amenity.id.in_(ids)).all()

    def get_all_amenities(self) -> list[Amenity]:
        return self.db.query(Amenity).all()
