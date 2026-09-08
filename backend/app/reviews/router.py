from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.cache.service import cache_service
from app.dependencies import get_current_user_id, get_db
from app.reviews.schemas import ReviewCreate, ReviewResponse
from app.reviews.service import ReviewService

router = APIRouter(prefix="/listings", tags=["reviews"])


@router.get("/{listing_id}/reviews")
def get_listing_reviews(
    listing_id: int, db: Session = Depends(get_db)
):
    cache_key = f"reviews:listing:{listing_id}"
    cached = cache_service.get(cache_key)
    if cached:
        return cached

    service = ReviewService(db)
    reviews = service.get_listing_reviews(listing_id)
    data = []
    for r in reviews:
        item = ReviewResponse.model_validate(r)
        if r.user:
            item.user_name = r.user.name
            item.user_avatar = r.user.avatar_url
        data.append(item.model_dump(mode="json"))

    cache_service.set(cache_key, data, ttl=600)   # 10 min
    return data


@router.post(
    "/{listing_id}/reviews",
    response_model=ReviewResponse,
    status_code=201,
)
def create_review(
    listing_id: int,
    data: ReviewCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = ReviewService(db)
    review = service.create_review(user_id, listing_id, data)
    item = ReviewResponse.model_validate(review)
    if review.user:
        item.user_name = review.user.name
        item.user_avatar = review.user.avatar_url

    # Rating and review_count on the listing just changed — drop both caches
    cache_service.delete(f"reviews:listing:{listing_id}")
    cache_service.delete(f"listing:{listing_id}")

    return item
