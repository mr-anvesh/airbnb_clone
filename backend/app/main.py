import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth.router import router as auth_router
from app.bookings.models import Booking
from app.bookings.router import host_booking_router, me_router, router as bookings_router
from app.config import settings
from app.core.middleware import RateLimitMiddleware, RequestIDMiddleware
from app.database.base import Base
from app.database.connection import engine
from app.listings.models import Amenity, Listing, ListingImage
from app.listings.router import host_router as listings_host_router
from app.listings.router import router as listings_router
from app.notifications.models import Notification
from app.notifications.router import router as notifications_router
from app.reviews.models import Review
from app.reviews.router import router as reviews_router
from app.upload.router import UPLOAD_DIR, router as upload_router
from app.users.models import User
from app.users.router import router as users_router
from app.wishlist.models import Wishlist
from app.wishlist.router import router as wishlist_router

logging.basicConfig(level=logging.INFO)

_models = [User, Listing, ListingImage, Amenity, Booking, Review, Wishlist, Notification]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="Airbnb Clone API",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware is applied in reverse order — last added runs first.
# Execution order: RequestID → RateLimit → CORS → route handler
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Global-Remaining", "Retry-After"],
)

app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(users_router, prefix=settings.API_V1_PREFIX)
app.include_router(listings_router, prefix=settings.API_V1_PREFIX)
app.include_router(listings_host_router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings_router, prefix=settings.API_V1_PREFIX)
app.include_router(me_router, prefix=settings.API_V1_PREFIX)
app.include_router(host_booking_router, prefix=settings.API_V1_PREFIX)
app.include_router(reviews_router, prefix=settings.API_V1_PREFIX)
app.include_router(wishlist_router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)
app.include_router(upload_router, prefix=settings.API_V1_PREFIX)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
def health_check():
    return {"status": "ok"}
