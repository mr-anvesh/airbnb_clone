import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.bookings.models import Booking
from app.database.base import Base
from app.listings.models import Amenity, Listing, ListingImage
from app.notifications.models import Notification
from app.reviews.models import Review
from app.users.models import User, UserRole
from app.wishlist.models import Wishlist

TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

_models = [User, Listing, ListingImage, Amenity, Booking, Review, Wishlist, Notification]


@event.listens_for(engine, "connect")
def configure_sqlite(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)


@pytest.fixture(autouse=True)
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_host(db):
    host = User(name="Test Host", email="host@test.com", role=UserRole.HOST)
    db.add(host)
    db.commit()
    db.refresh(host)
    return host


@pytest.fixture
def sample_guest(db):
    guest = User(
        name="Test Guest", email="guest@test.com", role=UserRole.GUEST
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


@pytest.fixture
def sample_listing(db, sample_host):
    listing = Listing(
        host_id=sample_host.id,
        title="Test Listing",
        description="A test listing",
        property_type="APARTMENT",
        location="Test City",
        latitude=0.0,
        longitude=0.0,
        price_per_night=100.0,
        max_guests=4,
        bedrooms=2,
        beds=2,
        bathrooms=1,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing
