from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_current_user_id, get_db
from app.wishlist.schemas import WishlistResponse, WishlistWithListing
from app.wishlist.service import WishlistService

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("")
def get_wishlist(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = WishlistService(db)
    items = service.get_user_wishlist(user_id)
    result = []
    for w in items:
        item = WishlistWithListing.model_validate(w)
        if w.listing:
            item.listing_title = w.listing.title
            item.listing_location = w.listing.location
            item.listing_price = w.listing.price_per_night
            item.listing_rating = w.listing.rating
            if w.listing.images:
                item.listing_image = w.listing.images[0].image_url
        result.append(item)
    return result


@router.post(
    "/{listing_id}",
    response_model=WishlistResponse,
    status_code=201,
)
def add_to_wishlist(
    listing_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = WishlistService(db)
    return service.add_to_wishlist(user_id, listing_id)


@router.delete("/{listing_id}", status_code=204)
def remove_from_wishlist(
    listing_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = WishlistService(db)
    service.remove_from_wishlist(user_id, listing_id)
