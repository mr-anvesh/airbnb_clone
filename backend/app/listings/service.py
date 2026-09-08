from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, UnauthorizedException
from app.listings.filters import validate_search_params
from app.listings.models import Listing, ListingImage
from app.listings.repository import ListingRepository
from app.listings.schemas import ListingCreate, ListingUpdate
from app.users.permissions import require_host, require_owner
from app.users.repository import UserRepository


class ListingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ListingRepository(db)
        self.user_repo = UserRepository(db)

    def get_listing(self, listing_id: int) -> Listing:
        listing = self.repo.get_by_id(listing_id)
        if not listing:
            raise NotFoundException(
                "LISTING_NOT_FOUND", "Listing not found"
            )
        return listing

    def search_listings(
        self,
        location: str | None = None,
        check_in: str | None = None,
        check_out: str | None = None,
        guests: int | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        property_type: str | None = None,
        amenities: list[int] | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Listing], int]:
        parsed_check_in, parsed_check_out = validate_search_params(
            check_in, check_out, guests, min_price, max_price
        )
        return self.repo.search(
            location=location,
            min_price=min_price,
            max_price=max_price,
            property_type=property_type,
            guests=guests,
            check_in=parsed_check_in,
            check_out=parsed_check_out,
            amenity_ids=amenities,
            offset=(page - 1) * page_size,
            limit=page_size,
        )

    def create_listing(
        self, host_id: int, data: ListingCreate
    ) -> Listing:
        host = self.user_repo.get_by_id(host_id)
        if not host:
            raise UnauthorizedException()
        require_host(host)

        amenities = (
            self.repo.get_amenities_by_ids(data.amenity_ids)
            if data.amenity_ids
            else []
        )
        listing = Listing(
            host_id=host.id,
            title=data.title,
            description=data.description,
            property_type=data.property_type,
            location=data.location,
            latitude=data.latitude,
            longitude=data.longitude,
            price_per_night=data.price_per_night,
            max_guests=data.max_guests,
            bedrooms=data.bedrooms,
            beds=data.beds,
            bathrooms=data.bathrooms,
            amenities=amenities,
            images=[
                ListingImage(
                    image_url=img.image_url,
                    display_order=img.display_order,
                )
                for img in data.images
            ],
        )
        return self.repo.create(listing)

    def update_listing(
        self, host_id: int, listing_id: int, data: ListingUpdate
    ) -> Listing:
        host = self.user_repo.get_by_id(host_id)
        if not host:
            raise UnauthorizedException()
        listing = self.get_listing(listing_id)
        require_owner(host, listing.host_id)

        update_data = data.model_dump(exclude_unset=True)
        amenity_ids = update_data.pop("amenity_ids", None)
        images_data = update_data.pop("images", None)

        for field, value in update_data.items():
            setattr(listing, field, value)

        if amenity_ids is not None:
            listing.amenities = self.repo.get_amenities_by_ids(amenity_ids)

        if images_data is not None:
            listing.images = [
                ListingImage(
                    image_url=img["image_url"],
                    display_order=img.get("display_order", 0),
                )
                for img in images_data
            ]

        return self.repo.update(listing)

    def delete_listing(self, host_id: int, listing_id: int) -> None:
        host = self.user_repo.get_by_id(host_id)
        if not host:
            raise UnauthorizedException()
        listing = self.get_listing(listing_id)
        require_owner(host, listing.host_id)
        self.repo.delete(listing)

    def get_host_listings(self, host_id: int) -> list[Listing]:
        host = self.user_repo.get_by_id(host_id)
        if not host:
            raise UnauthorizedException()
        require_host(host)
        return self.repo.get_by_host(host.id)

    def get_all_amenities(self):
        return self.repo.get_all_amenities()
