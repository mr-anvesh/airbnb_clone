from datetime import datetime

from pydantic import BaseModel, Field


class AmenityResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ListingImageResponse(BaseModel):
    id: int
    image_url: str
    display_order: int

    model_config = {"from_attributes": True}


class ListingImageCreate(BaseModel):
    image_url: str
    display_order: int = 0


class ListingBase(BaseModel):
    title: str
    description: str
    property_type: str
    location: str
    latitude: float
    longitude: float
    price_per_night: float = Field(ge=0)
    max_guests: int = Field(gt=0)
    bedrooms: int = Field(ge=0)
    beds: int = Field(ge=0)
    bathrooms: int = Field(ge=0)


class ListingCreate(ListingBase):
    amenity_ids: list[int] = []
    images: list[ListingImageCreate] = []


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    property_type: str | None = None
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    price_per_night: float | None = Field(default=None, ge=0)
    max_guests: int | None = Field(default=None, gt=0)
    bedrooms: int | None = None
    beds: int | None = None
    bathrooms: int | None = None
    amenity_ids: list[int] | None = None
    images: list[ListingImageCreate] | None = None


class HostBrief(BaseModel):
    id: int
    name: str
    avatar_url: str | None

    model_config = {"from_attributes": True}


class ListingCard(BaseModel):
    id: int
    title: str
    location: str
    property_type: str
    price_per_night: float
    rating: float
    review_count: int
    images: list[ListingImageResponse] = []

    model_config = {"from_attributes": True}


class ListingDetail(ListingBase):
    id: int
    host_id: int
    rating: float
    review_count: int
    created_at: datetime
    updated_at: datetime
    images: list[ListingImageResponse] = []
    amenities: list[AmenityResponse] = []
    host: HostBrief

    model_config = {"from_attributes": True}
