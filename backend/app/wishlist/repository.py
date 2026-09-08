from sqlalchemy.orm import Session, joinedload

from app.wishlist.models import Wishlist


class WishlistRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user(self, user_id: int) -> list[Wishlist]:
        return (
            self.db.query(Wishlist)
            .options(joinedload(Wishlist.listing))
            .filter(Wishlist.user_id == user_id)
            .all()
        )

    def get_by_user_and_listing(
        self, user_id: int, listing_id: int
    ) -> Wishlist | None:
        return (
            self.db.query(Wishlist)
            .filter(
                Wishlist.user_id == user_id,
                Wishlist.listing_id == listing_id,
            )
            .first()
        )

    def create(self, wishlist: Wishlist) -> Wishlist:
        self.db.add(wishlist)
        self.db.commit()
        self.db.refresh(wishlist)
        return wishlist

    def delete(self, wishlist: Wishlist) -> None:
        self.db.delete(wishlist)
        self.db.commit()
