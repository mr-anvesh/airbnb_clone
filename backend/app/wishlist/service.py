from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.listings.repository import ListingRepository
from app.wishlist.models import Wishlist
from app.wishlist.repository import WishlistRepository


class WishlistService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = WishlistRepository(db)
        self.listing_repo = ListingRepository(db)

    def get_user_wishlist(self, user_id: int) -> list[Wishlist]:
        return self.repo.get_by_user(user_id)

    def add_to_wishlist(
        self, user_id: int, listing_id: int
    ) -> Wishlist:
        listing = self.listing_repo.get_by_id(listing_id)
        if not listing:
            raise NotFoundException(
                "LISTING_NOT_FOUND", "Listing not found"
            )

        existing = self.repo.get_by_user_and_listing(
            user_id, listing_id
        )
        if existing:
            raise ConflictException(
                "ALREADY_IN_WISHLIST",
                "Listing already in wishlist",
            )

        wishlist = Wishlist(user_id=user_id, listing_id=listing_id)
        return self.repo.create(wishlist)

    def remove_from_wishlist(
        self, user_id: int, listing_id: int
    ) -> None:
        item = self.repo.get_by_user_and_listing(
            user_id, listing_id
        )
        if not item:
            raise NotFoundException(
                "NOT_FOUND", "Wishlist item not found"
            )
        self.repo.delete(item)
