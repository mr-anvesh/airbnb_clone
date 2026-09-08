import pytest

from app.core.exceptions import ConflictException, NotFoundException
from app.wishlist.service import WishlistService


def test_add_to_wishlist(db, sample_guest, sample_listing):
    service = WishlistService(db)
    item = service.add_to_wishlist(sample_guest.id, sample_listing.id)
    assert item.user_id == sample_guest.id
    assert item.listing_id == sample_listing.id


def test_duplicate_wishlist(db, sample_guest, sample_listing):
    service = WishlistService(db)
    service.add_to_wishlist(sample_guest.id, sample_listing.id)
    with pytest.raises(ConflictException):
        service.add_to_wishlist(sample_guest.id, sample_listing.id)


def test_remove_from_wishlist(db, sample_guest, sample_listing):
    service = WishlistService(db)
    service.add_to_wishlist(sample_guest.id, sample_listing.id)
    service.remove_from_wishlist(sample_guest.id, sample_listing.id)
    items = service.get_user_wishlist(sample_guest.id)
    assert len(items) == 0


def test_get_wishlist(db, sample_guest, sample_listing):
    service = WishlistService(db)
    service.add_to_wishlist(sample_guest.id, sample_listing.id)
    items = service.get_user_wishlist(sample_guest.id)
    assert len(items) == 1
