import pytest

from app.core.exceptions import ForbiddenException, NotFoundException
from app.listings.schemas import ListingCreate, ListingUpdate
from app.listings.service import ListingService


def test_create_listing(db, sample_host):
    service = ListingService(db)
    data = ListingCreate(
        title="New Listing",
        description="A beautiful place",
        property_type="APARTMENT",
        location="Mumbai",
        latitude=19.0760,
        longitude=72.8777,
        price_per_night=5000,
        max_guests=4,
        bedrooms=2,
        beds=2,
        bathrooms=1,
    )
    listing = service.create_listing(sample_host.id, data)
    assert listing.title == "New Listing"
    assert listing.host_id == sample_host.id


def test_get_listing(db, sample_listing):
    service = ListingService(db)
    listing = service.get_listing(sample_listing.id)
    assert listing.id == sample_listing.id


def test_get_listing_not_found(db):
    service = ListingService(db)
    with pytest.raises(NotFoundException):
        service.get_listing(9999)


def test_update_listing(db, sample_host, sample_listing):
    service = ListingService(db)
    data = ListingUpdate(title="Updated Title")
    listing = service.update_listing(sample_host.id, sample_listing.id, data)
    assert listing.title == "Updated Title"


def test_delete_listing(db, sample_host, sample_listing):
    service = ListingService(db)
    service.delete_listing(sample_host.id, sample_listing.id)
    with pytest.raises(NotFoundException):
        service.get_listing(sample_listing.id)


def test_guest_cannot_create_listing(db, sample_guest):
    service = ListingService(db)
    data = ListingCreate(
        title="New Listing",
        description="A beautiful place",
        property_type="APARTMENT",
        location="Mumbai",
        latitude=19.0760,
        longitude=72.8777,
        price_per_night=5000,
        max_guests=4,
        bedrooms=2,
        beds=2,
        bathrooms=1,
    )
    with pytest.raises(ForbiddenException):
        service.create_listing(sample_guest.id, data)
