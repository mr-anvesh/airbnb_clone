# Codex, Claude Implementation Specification — Airbnb Clone

> **Purpose:** This document is the implementation contract for an AI coding agent such as Codex, Claude.  
> Follow it as the source of truth for architecture, code organization, database design, API design, infrastructure, and implementation priorities.

---

# 1. Project Objective

Build a functional Airbnb-style web application that reproduces the core Airbnb browse, search, listing, booking, host-management, wishlist, and review experience.

The original assignment requires:

- Frontend: **Next.js + TypeScript**
- Backend: **Python + FastAPI**
- Database: **SQLite**
- Search and filters
- Listing details
- Date-range availability
- End-to-end booking flow
- Persistent bookings that block unavailable dates
- Guest "My Trips"
- Host listing CRUD
- Host dashboard
- Reviews
- Wishlist/favorites
- Notifications/toasts
- Airbnb-like UI/UX
- Seed data
- Documentation

Mocked functionality is acceptable for:

- Payments
- Messaging
- Identity verification
- Real authentication

The implementation must prioritize:

1. Functionality
2. Airbnb-like UI/UX
3. Database quality
4. Backend/API architecture
5. Code quality
6. Code modularity
7. Explainability of implementation decisions

The assignment has an approximately 24-hour implementation scope, so do not over-engineer features that are not directly useful to evaluation.

---

# 2. Non-Negotiable Architecture

Use:

```text
Next.js + TypeScript
        │
        ▼
Load Balancer
        │
        ▼
FastAPI application replicas
        │
        ├──────────────► Redis
        │                 Cache
        │
        ├──────────────► RabbitMQ
        │                 Async Messaging
        │
        ▼
SQLite
Source of Truth
```

Backend architecture:

```text
HTTP Request
     │
     ▼
Controller / Router
     │
     ▼
Service Layer
     │
     ▼
Repository Layer
     │
     ▼
SQLAlchemy Model
     │
     ▼
SQLite
```

Use **MVC** as the primary architectural pattern, with Service and Repository layers to keep business logic and data access separate.

The backend should be a **modular monolith with microservice-ready bounded contexts**.

Do NOT create multiple independently deployed microservices unless needed for a specific implementation reason. The logical boundaries must still be explicit so they can be extracted later.

---

# 3. Critical Design Principle

SQLite is the authoritative source of truth.

Redis is **not** the source of truth.

RabbitMQ is **not** the source of truth.

Booking state must always be determined authoritatively from SQLite.

The architecture must never rely on stale Redis data to finalize a booking.

---

# 4. Required Bounded Contexts

Implement these domains:

```text
users/
listings/
bookings/
reviews/
wishlist/
notifications/
```

Each major domain should have the following structure where appropriate:

```text
router.py
service.py
repository.py
models.py
schemas.py
```

Additional domain-specific files are allowed:

```text
filters.py
pricing.py
events.py
permissions.py
```

---

# 5. Recommended Repository Structure

Create the project approximately as follows:

```text
airbnb-clone/
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── search/
│   │   ├── listings/
│   │   │   └── [id]/
│   │   ├── trips/
│   │   ├── wishlist/
│   │   └── hosting/
│   │       ├── page.tsx
│   │       ├── listings/
│   │       ├── bookings/
│   │       └── create/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── navigation/
│   │   ├── search/
│   │   ├── listing/
│   │   ├── booking/
│   │   ├── host/
│   │   └── reviews/
│   │
│   ├── features/
│   │   ├── listings/
│   │   ├── bookings/
│   │   ├── wishlist/
│   │   ├── reviews/
│   │   └── host/
│   │
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   └── types/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── dependencies.py
│   │   │
│   │   ├── core/
│   │   │   ├── exceptions.py
│   │   │   ├── middleware.py
│   │   │   ├── pagination.py
│   │   │   └── responses.py
│   │   │
│   │   ├── database/
│   │   │   ├── connection.py
│   │   │   ├── base.py
│   │   │   └── seed.py
│   │   │
│   │   ├── users/
│   │   ├── listings/
│   │   ├── bookings/
│   │   ├── reviews/
│   │   ├── wishlist/
│   │   └── notifications/
│   │
│   ├── tests/
│   ├── migrations/
│   └── requirements.txt
│
├── docs/
│   ├── system-design.md
│   ├── database-erd.md
│   └── api.md
│
├── nginx/
│   └── nginx.conf
│
├── docker-compose.yml
├── .env.example
├── README.md
└── .gitignore
```

If the repository already contains code, preserve useful existing work and refactor toward this structure instead of blindly deleting working functionality.

---

# 6. Frontend Requirements

Use Next.js App Router and TypeScript.

The application should feel like a modern Airbnb-style marketplace, not a generic CRUD dashboard.

Implement:

## Explore/Home

- Airbnb-like header/navigation
- Search bar
- Location input
- Date range picker
- Guest selector
- Category row
- Filters
- Listing card grid
- Pagination or infinite scroll
- Wishlist/favorite action
- Rating and nightly price
- Responsive layout

## Listing Detail

- Photo gallery
- Title
- Location
- Rating/reviews
- Description
- Amenities
- Host information
- Availability/date picker
- Guest selector
- Price breakdown
- Reservation CTA
- Reviews
- Map using OpenStreetMap

## Booking

Flow:

```text
Select dates
    ↓
Select guests
    ↓
Check availability
    ↓
Calculate price
    ↓
Show booking summary
    ↓
Mock checkout
    ↓
Create confirmed booking
    ↓
Show confirmation
```

## My Trips

Display the current user's bookings:

- Listing
- Dates
- Guests
- Total
- Status

## Host Dashboard

- Host listings
- Create listing
- Edit listing
- Delete listing
- Listing images
- Amenities
- Listing bookings
- Basic booking status information

## Wishlist

- Add/remove favorite
- Wishlist page

## Reviews

- Display reviews
- Show aggregate rating
- Allow review after an eligible completed stay if time permits

---

# 7. Reusable Frontend Components

Create reusable components instead of copying markup.

At minimum, consider:

```text
Header
SearchBar
CategoryTabs
ListingCard
ListingGrid
FilterModal
DateRangePicker
GuestSelector
PriceBreakdown
BookingCard
ReviewList
Rating
Map
ImageUploader
Toast
Modal
Pagination
EmptyState
LoadingState
```

The same listing card, form controls, price breakdown, and date selector should be reused wherever possible.

---

# 8. Backend MVC Rules

## Controller / Router

Controllers handle:

- HTTP requests
- Input schema validation
- Authentication dependencies
- Calling services
- HTTP response serialization/status codes

Controllers should NOT contain substantial business logic.

Bad:

```python
@router.post("/bookings")
def create_booking(...):
    # 100 lines of booking rules, SQL, pricing, etc.
```

Good:

```python
@router.post("/bookings")
def create_booking(
    request: CreateBookingRequest,
    service: BookingService = Depends(get_booking_service),
):
    return service.create_booking(request)
```

## Service Layer

Services contain:

- Business rules
- Validation beyond simple schema validation
- Authorization checks
- Transaction orchestration
- Cross-repository operations
- Event publication

## Repository Layer

Repositories contain:

- SQLAlchemy queries
- CRUD operations
- Filtering/pagination queries
- Database-specific persistence logic

Business logic must not be duplicated across controllers.

---

# 9. Database Schema

Implement a normalized relational schema.

## users

```text
id PK
name
email UNIQUE
role
avatar_url
created_at
```

Roles:

```text
GUEST
HOST
```

## listings

```text
id PK
host_id FK → users.id
title
description
property_type
location
latitude
longitude
price_per_night
max_guests
bedrooms
beds
bathrooms
rating
review_count
created_at
updated_at
```

## listing_images

```text
id PK
listing_id FK → listings.id
image_url
display_order
```

## amenities

```text
id PK
name UNIQUE
```

## listing_amenities

```text
listing_id FK → listings.id
amenity_id FK → amenities.id

PRIMARY KEY(listing_id, amenity_id)
```

## bookings

```text
id PK
listing_id FK → listings.id
guest_id FK → users.id
check_in
check_out
guests
nightly_price
nights
cleaning_fee
service_fee
total_price
status
created_at
```

Statuses:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

## reviews

```text
id PK
listing_id FK → listings.id
user_id FK → users.id
booking_id FK → bookings.id
rating
comment
created_at
```

## wishlists

```text
id PK
user_id FK → users.id
listing_id FK → listings.id
created_at

UNIQUE(user_id, listing_id)
```

---

# 10. Database Constraints and Indexes

Implement foreign keys and validation constraints.

Important constraints:

```text
users.email UNIQUE
wishlists(user_id, listing_id) UNIQUE
rating BETWEEN 1 AND 5
check_out > check_in
price_per_night >= 0
max_guests > 0
```

Recommended indexes:

```text
users.email
listings.host_id
listings.location
listings.property_type
listings.price_per_night
bookings.listing_id
bookings.guest_id
bookings.check_in
bookings.check_out
reviews.listing_id
wishlists.user_id
```

For availability, create an index suitable for the overlap query, for example:

```sql
CREATE INDEX idx_booking_availability
ON bookings(listing_id, status, check_in, check_out);
```

Do not create unnecessary indexes blindly; prioritize fields actually used by filters and joins.

---

# 11. SQLite Configuration

SQLite must be configured for better concurrency.

Use:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Do not use `synchronous=OFF` just for benchmark speed.

SQLite remains the authoritative source of truth.

---

# 12. SQLite Connection Pooling

Use SQLAlchemy with an explicit bounded connection pool for the SQLite database.

Suggested starting configuration:

```python
engine = create_engine(
    "sqlite:///./data/airbnb.db",
    pool_size=4,
    max_overflow=0,
    pool_timeout=10,
    pool_recycle=1800,
    connect_args={
        "check_same_thread": False,
        "timeout": 5,
    },
)
```

Configure connections:

```python
@event.listens_for(engine, "connect")
def configure_sqlite(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.execute("PRAGMA busy_timeout=5000;")
    cursor.close()
```

Important:

- Keep the pool bounded.
- Do not use huge pool sizes such as 50–100 for SQLite.
- A connection pool provides connection reuse and bounded application concurrency; it does NOT turn SQLite into a multi-writer database.
- SQLite still serializes writes.

Every request should use a session dependency that returns connections to the pool:

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

# 13. SQLite Write Strategy

Critical writes must be short and transactional.

For a booking:

```text
Validate request
      ↓
Calculate price
      ↓
BEGIN TRANSACTION
      ↓
Check availability
      ↓
INSERT booking
      ↓
COMMIT
      ↓
Publish RabbitMQ event
```

Do NOT perform external API calls, email sending, uploads, or long computations inside the SQLite transaction.

The transaction should contain only the operations required to preserve the booking invariant.

---

# 14. Booking Availability Invariant

This is one of the most important pieces of the system.

The backend must guarantee:

> A listing cannot have overlapping CONFIRMED bookings.

Two ranges overlap when:

```text
existing.check_in < requested.check_out
AND
existing.check_out > requested.check_in
```

Example query:

```sql
SELECT id
FROM bookings
WHERE listing_id = ?
  AND status = 'CONFIRMED'
  AND check_in < ?
  AND check_out > ?
LIMIT 1;
```

If a matching booking exists:

```text
LISTING_NOT_AVAILABLE
```

The availability check and booking insertion must be performed within the same transaction.

Do not rely on a frontend availability check.

The frontend availability request is only for UX.

The final booking transaction is authoritative.

---

# 15. Booking Race Condition

The following must be prevented:

```text
User A → availability → YES
User B → availability → YES

User A → booking
User B → booking
```

Only one overlapping booking should succeed.

The architecture should make the authoritative booking operation transactional.

Also make the API return an appropriate conflict response when availability is lost between the frontend's initial availability check and final confirmation.

---

# 16. Redis Architecture

Use Redis as the shared cache.

Redis must not be treated as the source of truth.

Create a cache abstraction such as:

```text
CacheService
 ├── get(key)
 ├── set(key, value, ttl)
 ├── delete(key)
 └── invalidate(...)
```

Good cache candidates:

```text
listing:{id}
listing:{id}:reviews
amenities:all
categories:all
popular/search results
host public profile
```

Use reasonable TTLs.

Suggested starting values:

```text
Listing details: 5–15 minutes
Amenities/categories: hours
Search results: 30–120 seconds
```

These are implementation defaults, not guarantees. Keep them configurable.

---

# 17. Redis Cache-Aside Pattern

Use cache-aside/read-through behavior:

```text
GET request
    ↓
Check Redis
    ↓
 ┌──┴──────┐
 │         │
 HIT      MISS
 │         │
 ▼         ▼
Return   SQLite
           ↓
        Redis SET
           ↓
        Return
```

For listing mutations:

```text
UPDATE SQLite
      ↓
DELETE listing:{id}
```

Invalidate all affected derived cache keys when necessary.

Never use stale Redis availability as the final booking authority.

---

# 18. RabbitMQ Architecture

RabbitMQ is the asynchronous messaging and queue system.

Use it for work that should not block the HTTP request.

Examples:

- Booking confirmation notifications
- Host notifications
- Email/mock email jobs
- Analytics events
- Review-related asynchronous work
- Cache invalidation events where appropriate
- Future asynchronous integrations

Suggested topology:

```text
                     RabbitMQ
                        │
                 domain.events
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
 notification.q    analytics.q    future.q
          │             │             │
          ▼             ▼             ▼
 Notification      Analytics       Future
 Worker             Worker         Workers
```

Use:

- Durable exchanges
- Durable queues
- Manual acknowledgements
- Retry handling
- Dead-letter queues
- Idempotent consumers

---

# 19. Booking + RabbitMQ Interaction

Do NOT put the authoritative booking operation behind RabbitMQ.

Use:

```text
POST /bookings
      ↓
FastAPI
      ↓
SQLite transaction
      ├── availability check
      ├── booking insert
      └── commit
      ↓
Return success to client
      ↓
Publish BookingCreated
      ↓
RabbitMQ
      ↓
Notification / analytics workers
```

The booking must be durable before non-critical asynchronous side effects are triggered.

---

# 20. Event Definitions

Define clear domain events.

At minimum:

```text
UserCreated
ListingCreated
ListingUpdated
ListingDeleted
BookingCreated
BookingCancelled
BookingCompleted
ReviewCreated
WishlistUpdated
```

An event should contain enough information for consumers without requiring excessive synchronous follow-up requests.

Example:

```json
{
  "event_type": "BookingCreated",
  "event_id": "uuid",
  "booking_id": 123,
  "listing_id": 456,
  "guest_id": 789,
  "created_at": "..."
}
```

Event consumers should be idempotent.

---

# 21. Load Balancer

Put a load balancer in front of the FastAPI application.

Architecture:

```text
                        Load Balancer
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
        FastAPI #1      FastAPI #2      FastAPI #3
```

Use a simple Nginx configuration for local/demo deployment.

The load balancer should:

- Distribute requests
- Perform health checks
- Remove unhealthy instances
- Optionally terminate TLS in a production-like deployment

Create a health endpoint:

```http
GET /health
```

Return something like:

```json
{
  "status": "ok"
}
```

The API should be stateless.

Do not depend on in-process mutable state for correctness.

---

# 22. Important SQLite + Load Balancer Caveat

Do not claim that multiple FastAPI replicas create unlimited horizontal scaling with SQLite.

The constraint is:

```text
Multiple API instances
        ↓
Multiple connection pools
        ↓
Same SQLite source of truth
        ↓
SQLite write serialization
```

The application tier can be replicated, but SQLite remains the limiting factor for heavy concurrent writes.

For this assignment, SQLite is mandated, so optimize around that limitation.

Do not introduce PostgreSQL.

---

# 23. OpenStreetMap

Use **OpenStreetMap** for maps.

Store in listings:

```text
latitude
longitude
location
```

Use the frontend map to display:

- Listing location
- Listing markers
- Search context
- Basic map interaction if practical

Do not build a proprietary map system.

---

# 24. UploadThing

Use **UploadThing by Theo** for image uploads.

Expected flow:

```text
Host
  ↓
Next.js upload UI
  ↓
UploadThing
  ↓
Returned secure/public URL
  ↓
Listing API
  ↓
listing_images
```

The database stores URLs and metadata.

Do not store raw image binary data in SQLite.

Do not expose UploadThing secrets to the browser.

Use environment variables for integration credentials/configuration.

---

# 25. Authentication and Authorization

The assignment allows simplified authentication.

Implement a minimal but explicit current-user concept.

Users must have:

```text
role = GUEST
or
role = HOST
```

The frontend may use a mocked session/current-user selector.

The backend must still enforce ownership.

For example:

```python
if listing.host_id != current_user.id:
    raise ForbiddenException()
```

Never trust the frontend to enforce authorization.

---

# 26. API Versioning

Use:

```text
/api/v1/
```

for all backend APIs.

Examples:

```text
GET    /api/v1/listings
GET    /api/v1/listings/{id}

POST   /api/v1/listings
PUT    /api/v1/listings/{id}
DELETE /api/v1/listings/{id}

GET    /api/v1/listings/{id}/availability

POST   /api/v1/bookings
GET    /api/v1/bookings/{id}
POST   /api/v1/bookings/{id}/cancel

GET    /api/v1/me/bookings

GET    /api/v1/host/listings
GET    /api/v1/host/bookings

GET    /api/v1/listings/{id}/reviews
POST   /api/v1/listings/{id}/reviews

GET    /api/v1/wishlist
POST   /api/v1/wishlist/{listing_id}
DELETE /api/v1/wishlist/{listing_id}
```

Use consistent request/response schemas.

---

# 27. Listing Search

Support:

- Location
- Check-in
- Check-out
- Guests
- Min price
- Max price
- Property type
- Amenities

Example:

```http
GET /api/v1/listings?
    location=Goa
    &check_in=2026-10-10
    &check_out=2026-10-15
    &guests=4
    &min_price=100
    &max_price=500
    &property_type=VILLA
```

Return paginated results.

Example:

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 143,
  "has_next": true
}
```

Do not return thousands of records in one request.

---

# 28. Search Query Rules

The listing service should:

1. Validate filters
2. Apply basic listing filters
3. Apply guest-capacity filtering
4. Apply date availability filtering when dates are provided
5. Apply pagination
6. Return a predictable response schema

Keep query construction in the repository.

Keep filter/business interpretation in the service.

---

# 29. Price Calculation

Never trust a total price submitted by the frontend.

The backend calculates:

```text
nightly rate × nights
+ cleaning fee
+ service fee
= total
```

Example response:

```json
{
  "nights": 4,
  "nightly_subtotal": 400,
  "cleaning_fee": 50,
  "service_fee": 60,
  "total": 510
}
```

Create a dedicated pricing module/service so pricing logic is not duplicated.

---

# 30. Host CRUD

Hosts can:

```text
Create listing
Read listing
Update listing
Delete listing
```

Creation fields:

- Title
- Description
- Property type
- Location
- Latitude/longitude
- Price
- Max guests
- Bedrooms
- Beds
- Bathrooms
- Amenities
- Photos

Use one reusable frontend form for create/edit where practical.

Verify host ownership in backend services.

---

# 31. Reviews

A review should reference:

```text
listing_id
user_id
booking_id
rating
comment
```

Validate:

- Rating range
- User eligibility
- Listing existence
- Booking association

Optional bonus:

```text
Only completed stays may submit reviews.
```

Maintain aggregate rating fields where useful for efficient listing-card reads:

```text
rating
review_count
```

Update aggregates when reviews change.

---

# 32. Wishlist

Use a many-to-many association through `wishlists`.

Prevent duplicate entries with:

```text
UNIQUE(user_id, listing_id)
```

Implement:

```text
GET    /api/v1/wishlist
POST   /api/v1/wishlist/{listing_id}
DELETE /api/v1/wishlist/{listing_id}
```

---

# 33. Error Handling

Implement centralized exceptions and consistent API error responses.

Example:

```json
{
  "error": {
    "code": "LISTING_NOT_AVAILABLE",
    "message": "The selected dates are no longer available.",
    "request_id": "abc123"
  }
}
```

Common errors:

```text
LISTING_NOT_FOUND
BOOKING_NOT_FOUND
LISTING_NOT_AVAILABLE
INVALID_DATE_RANGE
INVALID_GUEST_COUNT
UNAUTHORIZED
FORBIDDEN
HOST_OWNERSHIP_REQUIRED
REVIEW_NOT_ALLOWED
```

Use appropriate HTTP status codes.

---

# 34. Observability

Implement lightweight observability:

- Structured logs
- Request IDs
- Request timing
- Centralized error handling
- Health endpoint

A request log should make it possible to identify:

```text
method
path
status
duration
request_id
```

Do not build a large monitoring platform.

---

# 35. Database Seeding

Create seed data so the app is usable immediately.

Include approximately:

- 4–8 users
- Multiple hosts
- 15–30 listings
- Multiple listing photos
- Amenities
- Existing confirmed/cancelled bookings
- Reviews
- Wishlist items

Seed listings across multiple:

- Locations
- Price ranges
- Property types
- Guest capacities
- Amenities

The search, availability, and booking experience should be demonstrable immediately after seeding.

---

# 36. Testing Requirements

Prioritize tests around business-critical behavior.

## Unit tests

Test:

```text
date validation
overlap logic
price calculation
guest validation
authorization
```

## Integration tests

Test:

```text
create booking
prevent overlapping booking
cancel booking
listing CRUD
wishlist behavior
review eligibility
```

## API tests

Test important success/error cases.

Especially:

```text
POST /api/v1/bookings
```

with competing/overlapping date ranges.

---

# 37. Security Requirements

Follow these rules:

- Never trust frontend price values
- Never trust frontend roles/permissions
- Validate all API input
- Verify host ownership server-side
- Validate guest capacity server-side
- Keep secrets in environment variables
- Do not expose UploadThing secrets
- Use ORM/parameterized queries
- Sanitize/validate user-controlled values
- Use secure CORS configuration appropriate to the deployment
- Do not put credentials in source code

---

# 38. Docker / Local Infrastructure

Provide a `docker-compose.yml` with:

```text
load-balancer
api-1
api-2
api-3
redis
rabbitmq
worker
```

SQLite data should be persisted using a volume.

Conceptually:

```yaml
volumes:
  sqlite_data:
```

All API instances intended to share the same source-of-truth SQLite file must use the same database storage path.

Be aware that this is a constrained demo/assignment topology; do not claim that arbitrary multi-host shared filesystems are a best-practice production deployment for SQLite.

RabbitMQ and Redis should be reachable through service names.

Example conceptual environment:

```text
REDIS_URL=redis://redis:6379/0
RABBITMQ_URL=amqp://...
DATABASE_URL=sqlite:///./data/airbnb.db
```

---

# 39. Environment Variables

Create `.env.example`.

Include placeholders for:

```text
DATABASE_URL
REDIS_URL
RABBITMQ_URL

UPLOADTHING_TOKEN
UPLOADTHING_APP_ID

NEXT_PUBLIC_API_URL
```

Do not commit real credentials.

---

# 40. Docker Health / Service Dependencies

The Docker setup should wait for required infrastructure where practical.

The API should fail clearly when required infrastructure is missing.

Redis/RabbitMQ failure should not silently corrupt booking state.

Booking writes must remain authoritative in SQLite.

For asynchronous failures, RabbitMQ retry/dead-letter behavior should prevent lost work.

---

# 41. Transaction and Event Ordering

For booking creation:

```text
1. Validate
2. BEGIN SQLite transaction
3. Check availability
4. Insert booking
5. COMMIT
6. Publish BookingCreated
```

The implementation should acknowledge that step 5 and step 6 are separate systems.

Do NOT falsely claim that a simple transaction automatically gives atomicity across SQLite and RabbitMQ.

For this assignment, prioritize a correct durable booking transaction first.

A future production improvement could use an **outbox pattern** if guaranteed DB-to-message atomicity is required:

```text
SQLite transaction
    ├── booking row
    └── outbox event
             ↓
       Publisher Worker
             ↓
         RabbitMQ
```

Do not implement a full outbox system unless the rest of the application is already stable.

---

# 42. Performance Strategy for SQLite

The performance strategy should be:

```text
Load Balancer
      ↓
Stateless FastAPI replicas
      ↓
Redis cache for read-heavy traffic
      ↓
Short indexed SQLite queries
      ↓
Bounded connection pools
      ↓
WAL mode
      ↓
Short SQLite write transactions
      ↓
RabbitMQ for non-critical async work
```

Do not attempt to scale SQLite by increasing the write connection pool to a huge value.

The main SQLite bottleneck is concurrent writes.

---

# 43. Caching Rules

Cache:

```text
Listing detail
Public listing metadata
Amenities
Popular searches
Review summaries
```

Be cautious with:

```text
Availability
Booking state
Cancellation state
```

The database is authoritative for booking correctness.

After mutations, invalidate relevant Redis keys.

---

# 44. Async Work Rules

Send to RabbitMQ:

```text
notifications
analytics
email/mock-email
background aggregations
other non-critical side effects
```

Keep synchronous:

```text
booking confirmation
availability validation
critical authorization
source-of-truth CRUD
```

---

# 45. Future Microservice Extraction

The code should make it possible to extract:

```text
User Service
Listing Service
Booking Service
Review Service
Wishlist Service
Notification Service
```

without major rewrites.

Potential future architecture:

```text
                     API Gateway
                          │
         ┌────────────────┼─────────────────┐
         ▼                ▼                 ▼
   User Service     Listing Service    Booking Service
         │                │                 │
         ▼                ▼                 ▼
      User DB         Listing DB         Booking DB
                                             │
                                             ▼
                                         RabbitMQ
                                             │
                                ┌─────────────┼─────────────┐
                                ▼             ▼             ▼
                              Review      Notification   Analytics
```

Redis can remain a shared cache/infrastructure service, although a production system may choose more domain-specific cache strategies.

---

# 46. What NOT to Do

Do not:

- Put database logic directly into React components
- Put SQL/business rules directly inside FastAPI route handlers
- Trust frontend availability checks
- Trust frontend prices
- Use Redis as the booking source of truth
- Put booking creation behind an asynchronous queue
- Use enormous SQLite connection pools
- Perform long network operations inside SQLite transactions
- Duplicate listing/booking UI components
- Create unnecessary microservices just to increase architecture complexity
- Implement PostgreSQL
- Replace SQLite with another database
- Build a custom image-storage service instead of using UploadThing
- Build a proprietary map service instead of OpenStreetMap
- Add complex payment integration
- Implement full authentication unless needed

---

# 47. Implementation Order

Implement in this order.

## Phase 1 — Project Setup

1. Inspect the existing repository.
2. Preserve any working code.
3. Set up frontend/backend structure.
4. Configure environment variables.
5. Configure FastAPI.
6. Configure SQLAlchemy and SQLite.
7. Configure Redis.
8. Configure RabbitMQ.
9. Add Docker Compose.
10. Add Nginx load balancer.

## Phase 2 — Database

1. Define models.
2. Define relationships.
3. Add constraints.
4. Add indexes.
5. Add migrations.
6. Add seed script.
7. Verify foreign keys and WAL configuration.

## Phase 3 — Backend Core

Implement:

1. Users
2. Listings CRUD
3. Search/filtering
4. Availability
5. Pricing
6. Booking
7. My Trips
8. Host dashboard APIs
9. Wishlist
10. Reviews

## Phase 4 — Infrastructure

Implement:

1. Redis cache-aside
2. Cache invalidation
3. RabbitMQ connection
4. Event publisher
5. Notification worker
6. Analytics worker
7. Retry/DLQ basics
8. Health endpoints

## Phase 5 — Frontend

Implement:

1. Airbnb-style home
2. Search
3. Listing grid
4. Listing details
5. Gallery
6. Calendar
7. Guest selector
8. Booking card
9. Checkout confirmation
10. My Trips
11. Host dashboard
12. Wishlist
13. Reviews
14. Map
15. UploadThing image upload

## Phase 6 — Quality

1. Loading states
2. Error states
3. Empty states
4. Toasts
5. Responsive layout
6. Form validation
7. Unit tests
8. Integration tests
9. API tests
10. README
11. Architecture diagrams
12. Deployment verification

---

# 48. Definition of Done

The implementation is complete only when:

## Functionality

- User can browse listings
- User can search/filter listings
- User can view listing details
- User can select dates
- User can see unavailable dates
- User can book a listing
- Overlapping confirmed bookings are rejected
- Bookings persist
- My Trips displays bookings
- Host can create a listing
- Host can edit a listing
- Host can delete a listing
- Host can see listing bookings
- Wishlist works
- Reviews display
- Mock checkout works

## Architecture

- MVC is clearly represented
- Controllers do not contain business logic
- Services contain business rules
- Repositories contain database access
- Domain modules are separated
- Redis is actually used for caching
- RabbitMQ is actually used for asynchronous jobs
- Load balancer is represented/configured
- SQLite is the source of truth
- SQLite WAL is enabled
- Connection pooling is bounded

## Integrations

- OpenStreetMap is used
- UploadThing is used for listing images

## Code Quality

- TypeScript types are used
- Pydantic schemas are used
- Reusable components exist
- Duplicate business logic is minimized
- Error handling is consistent
- Configuration uses environment variables
- Tests cover critical business logic

---

# 49. Required Documentation

Update `README.md` with:

1. Project overview
2. Tech stack
3. How to run locally
4. Docker setup
5. Environment variables
6. Architecture overview
7. MVC explanation
8. Database schema / ERD
9. API overview
10. Redis strategy
11. RabbitMQ strategy
12. SQLite scaling limitations
13. OpenStreetMap integration
14. UploadThing integration
15. Booking concurrency strategy
16. Testing
17. Deployment
18. Assumptions
19. Future production architecture

---

# 50. AI Agent Execution Rules

When implementing, follow these rules:

### Inspect before modifying

First inspect:

```text
frontend/
backend/
package.json
requirements.txt
docker-compose.yml
README.md
```

Do not overwrite existing working code blindly.

### Implement incrementally

After each major domain:

```text
implement
→ run tests
→ run type checks/lint
→ fix errors
→ continue
```

### Keep code understandable

Prefer clear code over clever abstractions.

Do not introduce a framework or dependency solely because it appears in a generic architecture diagram.

### Preserve boundaries

When adding functionality, determine which domain owns it before writing code.

### No fake integrations

If Redis is in the architecture, actually use Redis.

If RabbitMQ is in the architecture, actually publish/consume messages.

If UploadThing is configured, wire it into listing image upload.

If OpenStreetMap is shown, use it in the frontend.

### Don't claim unimplemented features

Only document functionality that actually exists.

---

# 51. Final Architecture

The finished system should conceptually look like:

```text
                              USERS
                                │
                                ▼
                       ┌─────────────────┐
                       │ Load Balancer   │
                       │     Nginx       │
                       └────────┬────────┘
                                │
               ┌────────────────┼────────────────┐
               ▼                ▼                ▼
          ┌──────────┐     ┌──────────┐     ┌──────────┐
          │ FastAPI  │     │ FastAPI  │     │ FastAPI  │
          │ Server 1 │     │ Server 2 │     │ Server 3 │
          └────┬─────┘     └────┬─────┘     └────┬─────┘
               │                │                │
             Pool #1          Pool #2          Pool #3
               │                │                │
               └────────────────┼────────────────┘
                                │
                  ┌─────────────┼──────────────┐
                  │             │              │
                  ▼             ▼              ▼
              ┌────────┐   ┌───────────┐  ┌──────────────┐
              │ Redis  │   │ RabbitMQ  │  │   SQLite     │
              │ Cache  │   │  Queues   │  │ Source Truth │
              └────────┘   └─────┬─────┘  │    + WAL     │
                                  │        └──────────────┘
                         ┌────────┼─────────┐
                         ▼        ▼         ▼
                    Notification Analytics Future
                       Worker      Worker   Workers


FastAPI internal architecture:

Request
   │
   ▼
Controller / Router
   │
   ▼
Service
   │
   ├──────────► Redis
   │
   ├──────────► RabbitMQ
   │
   ▼
Repository
   │
   ▼
SQLAlchemy Model
   │
   ▼
SQLite
```

---

# 52. Final Engineering Principle

The implementation should demonstrate this separation clearly:

```text
Load Balancer
    = application traffic distribution

FastAPI
    = stateless API/application layer

MVC
    = separation of presentation/input, business logic, and persistence

Service Layer
    = business rules

Repository
    = persistence abstraction

Redis
    = read acceleration / cache

RabbitMQ
    = asynchronous work and domain events

SQLite
    = authoritative source of truth

OpenStreetMap
    = maps/geolocation visualization

UploadThing
    = image/file storage

Microservice boundaries
    = future independent scaling
```

The goal is not to make the architecture unnecessarily complicated.

The goal is to demonstrate **excellent engineering judgment**: keep SQLite as the required source of truth, minimize and shorten writes, cache read-heavy traffic in Redis, move non-critical work to RabbitMQ, keep FastAPI stateless behind a load balancer, and maintain strong MVC/domain boundaries throughout the codebase.
