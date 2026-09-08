from sqlalchemy.orm import Session, joinedload

from app.reviews.models import Review


class ReviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_listing(self, listing_id: int) -> list[Review]:
        return (
            self.db.query(Review)
            .options(joinedload(Review.user))
            .filter(Review.listing_id == listing_id)
            .order_by(Review.created_at.desc())
            .all()
        )

    def get_by_booking(self, booking_id: int) -> Review | None:
        return (
            self.db.query(Review)
            .filter(Review.booking_id == booking_id)
            .first()
        )

    def create(self, review: Review) -> Review:
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review
