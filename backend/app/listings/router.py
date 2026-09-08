import hashlib
import json
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.bookings.schemas import AvailabilityCheck, AvailabilityResponse
from app.bookings.service import BookingService
from app.cache.service import cache_service
from app.dependencies import get_current_user_id, get_db
from app.listings.schemas import (
    AmenityResponse,
    ListingCard,
    ListingCreate,
    ListingDetail,
    ListingUpdate,
)
from app.listings.service import ListingService

router = APIRouter(prefix="/listings", tags=["listings"])
host_router = APIRouter(prefix="/host", tags=["host"])


# ---------------------------------------------------------------------------
# Cache key helpers
# ---------------------------------------------------------------------------

def _search_key(
    location, check_in, check_out, guests,
    min_price, max_price, property_type, amenities, page, page_size
) -> str:
    params = {
        "location": location, "check_in": check_in, "check_out": check_out,
        "guests": guests, "min_price": min_price, "max_price": max_price,
        "property_type": property_type, "amenities": amenities,
        "page": page, "page_size": page_size,
    }
    clean = {k: v for k, v in params.items() if v is not None}
    digest = hashlib.md5(
        json.dumps(clean, sort_keys=True).encode()
    ).hexdigest()[:16]
    return f"listings:search:{digest}"


# ---------------------------------------------------------------------------
# Public listing routes
# ---------------------------------------------------------------------------

@router.get("")
def search_listings(
    location: str | None = None,
    check_in: str | None = None,
    check_out: str | None = None,
    guests: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    property_type: str | None = None,
    amenities: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    cache_key = _search_key(
        location, check_in, check_out, guests,
        min_price, max_price, property_type, amenities, page, page_size
    )
    cached = cache_service.get(cache_key)
    if cached:
        return cached

    service = ListingService(db)
    amenity_ids = (
        [int(a) for a in amenities.split(",") if a]
        if amenities else None
    )
    items, total = service.search_listings(
        location=location,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        min_price=min_price,
        max_price=max_price,
        property_type=property_type,
        amenities=amenity_ids,
        page=page,
        page_size=page_size,
    )
    result = {
        "items": [ListingCard.model_validate(i).model_dump(mode="json") for i in items],
        "page": page,
        "page_size": page_size,
        "total": total,
        "has_next": page * page_size < total,
    }
    cache_service.set(cache_key, result, ttl=300)   # 5 min
    return result


@router.get("/amenities", response_model=list[AmenityResponse])
def get_amenities(db: Session = Depends(get_db)):
    cached = cache_service.get("amenities:all")
    if cached:
        return cached

    service = ListingService(db)
    amenities = service.get_all_amenities()
    data = [AmenityResponse.model_validate(a).model_dump(mode="json") for a in amenities]
    cache_service.set("amenities:all", data, ttl=3600)   # 1 hour – nearly static
    return data


@router.get("/{listing_id}", response_model=ListingDetail)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    cached = cache_service.get(f"listing:{listing_id}")
    if cached:
        return cached

    service = ListingService(db)
    listing = service.get_listing(listing_id)
    data = ListingDetail.model_validate(listing).model_dump(mode="json")
    cache_service.set(f"listing:{listing_id}", data, ttl=600)   # 10 min
    return data


@router.get("/{listing_id}/availability")
def check_availability(
    listing_id: int,
    check_in: str = Query(...),
    check_out: str = Query(...),
    db: Session = Depends(get_db),
):
    # Availability is date-sensitive — never cache
    service = BookingService(db)
    data = AvailabilityCheck(
        listing_id=listing_id,
        check_in=date.fromisoformat(check_in),
        check_out=date.fromisoformat(check_out),
    )
    available, breakdown = service.check_availability(data)
    return AvailabilityResponse(available=available, price_breakdown=breakdown)


# ---------------------------------------------------------------------------
# Write routes — call service then invalidate relevant keys
# ---------------------------------------------------------------------------

@router.post("", response_model=ListingDetail, status_code=201)
def create_listing(
    data: ListingCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.create_listing(user_id, data)
    detail = service.get_listing(listing.id)

    # New listing changes search results and host dashboard
    cache_service.invalidate("listings:search:*")
    cache_service.delete(f"host:listings:{user_id}")

    return detail


@router.put("/{listing_id}", response_model=ListingDetail)
def update_listing(
    listing_id: int,
    data: ListingUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    service.update_listing(user_id, listing_id, data)
    detail = service.get_listing(listing_id)

    cache_service.delete(f"listing:{listing_id}")
    cache_service.invalidate("listings:search:*")
    cache_service.delete(f"host:listings:{user_id}")

    return detail


@router.delete("/{listing_id}", status_code=204)
def delete_listing(
    listing_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    service.delete_listing(user_id, listing_id)

    cache_service.delete(f"listing:{listing_id}")
    cache_service.invalidate("listings:search:*")
    cache_service.delete(f"host:listings:{user_id}")


# ---------------------------------------------------------------------------
# Host dashboard routes
# ---------------------------------------------------------------------------

@host_router.get("/listings", response_model=list[ListingCard])
def get_host_listings(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    cached = cache_service.get(f"host:listings:{user_id}")
    if cached:
        return cached

    service = ListingService(db)
    listings = service.get_host_listings(user_id)
    data = [ListingCard.model_validate(l).model_dump(mode="json") for l in listings]
    cache_service.set(f"host:listings:{user_id}", data, ttl=300)   # 5 min
    return data
