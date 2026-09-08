from sqlalchemy.orm import Session

from app.bookings.models import BookingStatus
from app.bookings.repository import BookingRepository
from app.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from app.listings.repository import ListingRepository
from app.messaging.events import DomainEvent, EventType
from app.messaging.publisher import event_publisher
from app.reviews.models import Review
from app.reviews.repository import ReviewRepository
from app.reviews.schemas import ReviewCreate


class ReviewService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ReviewRepository(db)
        self.booking_repo = BookingRepository(db)
        self.listing_repo = ListingRepository(db)

    def create_review(
        self, user_id: int, listing_id: int, data: ReviewCreate
    ) -> Review:
        booking = self.booking_repo.get_by_id(data.booking_id)
        if not booking:
            raise NotFoundException(
                "BOOKING_NOT_FOUND", "Booking not found"
            )
        if booking.guest_id != user_id:
            raise ForbiddenException(
                "FORBIDDEN", "You can only review your own bookings"
            )
        if booking.listing_id != listing_id:
            raise BadRequestException(
                "BAD_REQUEST", "Booking does not match listing"
            )
        if booking.status not in (
            BookingStatus.COMPLETED,
            BookingStatus.CONFIRMED,
        ):
            raise BadRequestException(
                "REVIEW_NOT_ALLOWED",
                "Can only review completed stays",
            )

        if self.repo.get_by_booking(data.booking_id):
            raise BadRequestException(
                "REVIEW_NOT_ALLOWED",
                "You have already reviewed this booking",
            )

        review = Review(
            listing_id=listing_id,
            user_id=user_id,
            booking_id=data.booking_id,
            rating=data.rating,
            comment=data.comment,
        )
        self.db.add(review)

        # Update listing aggregate rating
        listing = self.listing_repo.get_by_id(listing_id)
        if listing:
            total_rating = (
                listing.rating * listing.review_count + data.rating
            )
            listing.review_count += 1
            listing.rating = round(
                total_rating / listing.review_count, 2
            )

        self.db.commit()
        self.db.refresh(review)

        # Publish ReviewCreated event for host notification
        try:
            listing = self.listing_repo.get_by_id(listing_id)
            guest_name = review.user.name if review.user else "A guest"
            event_publisher.publish(DomainEvent(
                event_type=EventType.REVIEW_CREATED,
                data={
                    "review_id": review.id,
                    "listing_id": listing_id,
                    "listing_title": listing.title if listing else "",
                    "host_id": listing.host_id if listing else None,
                    "guest_id": user_id,
                    "guest_name": guest_name,
                    "rating": data.rating,
                    "booking_id": data.booking_id,
                },
            ))
        except Exception:
            pass  # Event publish failure must never break the booking flow

        return review

    def get_listing_reviews(self, listing_id: int) -> list[Review]:
        return self.repo.get_by_listing(listing_id)
