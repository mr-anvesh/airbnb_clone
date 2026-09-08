# Airbnb Clone — Full-Stack Web Application

A functional clone of the Airbnb web application built as an SDE Full-Stack assignment. Replicates Airbnb's design system, user experience, and core booking workflows including property browsing, search with date-range filtering, listing management, booking flow, wishlists, reviews, and host notifications.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [API Overview](#api-overview)
5. [Setup Instructions](#setup-instructions)
6. [Docker Compose](#docker-compose-full-stack)
7. [Additional Documentation](#additional-documentation)
8. [Demo Credentials](#demo-credentials)
9. [Key Features](#key-features)
10. [Assumptions & Design Decisions](#assumptions--design-decisions)

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Web framework | FastAPI 0.115 |
| Language | Python 3.14 |
| Database | SQLite (via SQLAlchemy 2.0, ORM) |
| Migrations | Alembic |
| Authentication | JWT (python-jose) + bcrypt password hashing (passlib) |
| Caching | Redis — response caching for listings, reviews, amenities |
| Rate limiting | Redis — token-bucket algorithm via atomic Lua script |
| Async messaging | RabbitMQ (pika) — domain events for host notifications |
| File uploads | Local filesystem (`data/uploads/`), served as static files |
| Validation | Pydantic v2 |
| ASGI server | Uvicorn |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Map | React-Leaflet + Leaflet.js |
| Date utilities | date-fns v4 |
| State | React Context (AuthContext, ThemeContext) |

### Infrastructure
| Service | Purpose |
|---|---|
| Redis (local or hosted) | API response cache + token-bucket rate limiter |
| RabbitMQ | BOOKING_CREATED / BOOKING_CANCELLED / REVIEW_CREATED events |
| SQLite | Primary datastore (file: `backend/data/airbnb.db`) |
| Nginx | Load balancer in front of three FastAPI replicas (Docker only) |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Next.js 16 — localhost:3000)                           │
│                                                                  │
│  AuthContext (JWT)  ·  ThemeContext (dark/light)                 │
│  Pages: Home · Listing Detail · Booking Confirm · Trips ·       │
│         Wishlist · Hosting Dashboard · Create/Edit Listing       │
└────────────────────────────┬─────────────────────────────────────┘
                             │  HTTP/REST  (Bearer token)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  FastAPI  (localhost:8000)                                       │
│                                                                  │
│  Middleware stack (applied in order):                            │
│    1. RequestIDMiddleware  — UUID per request, logs timing       │
│    2. RateLimitMiddleware  — token-bucket via Redis Lua script   │
│    3. CORSMiddleware       — allow localhost:3000                │
│                                                                  │
│  Routers                                                         │
│    /api/v1/auth          → auth/router.py                        │
│    /api/v1/listings      → listings/router.py   (cached)         │
│    /api/v1/bookings      → bookings/router.py                    │
│    /api/v1/me            → bookings/router.py   (my trips)       │
│    /api/v1/host          → listings + bookings  (host views)     │
│    /api/v1/reviews       → reviews/router.py    (cached)         │
│    /api/v1/wishlist      → wishlist/router.py                    │
│    /api/v1/notifications → notifications/router.py              │
│    /api/v1/upload        → upload/router.py                      │
│    /uploads/*            → StaticFiles                          │
│                                                                  │
│  Each domain: router → service → repository → SQLAlchemy model  │
└──────┬────────────────────┬──────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐    ┌────────────────────────────────────────────┐
│   SQLite    │    │  Redis                                     │
│  (SQLAlch.) │    │   • Cache: listing:{id}          10 min   │
│             │    │           listings:search:{hash}  5 min   │
│  9 tables   │    │           amenities:all           1 hour  │
│  (see below)│    │           reviews:listing:{id}   10 min   │
│             │    │           host:listings:{uid}     5 min   │
└─────────────┘    │   • Rate limit buckets: rl:{tier}:{id}    │
                   └────────────────────────────────────────────┘
                             │
                    publish events
                             ▼
                   ┌──────────────────┐
                   │   RabbitMQ       │
                   │  exchange:       │
                   │  domain.events   │
                   │  (topic, durable)│
                   └────────┬─────────┘
                            │ consume
                            ▼
                   ┌──────────────────┐
                   │ notification_    │
                   │ worker.py        │
                   │                  │
                   │ Handles:         │
                   │ BOOKING_CREATED  │ → notify host
                   │ BOOKING_CANCEL.  │ → notify host
                   │ REVIEW_CREATED   │ → notify host
                   └──────────────────┘
```

### Domain Module Structure

Each domain follows a strict 4-layer pattern:

```
app/{domain}/
  models.py      — SQLAlchemy ORM model
  schemas.py     — Pydantic request/response schemas
  repository.py  — raw DB queries (no business logic)
  service.py     — business logic, orchestration
  router.py      — FastAPI routes, cache read/write, HTTP concerns
```

---

## Database Schema

### Entity-Relationship Summary

```
users ──< listings ──< listing_images
  │            │
  │            ├──< listing_amenities >── amenities
  │            │
  │            ├──< bookings >──── users (guest)
  │            │         │
  │            │         └──< reviews ──── users
  │            │
  │            └──< wishlists >──── users
  │
  └──< notifications
```

### Table Definitions

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `name` | VARCHAR(255) | Full name |
| `email` | VARCHAR(255) | Unique, indexed |
| `role` | VARCHAR(5) | `GUEST` or `HOST` |
| `avatar_url` | VARCHAR(500) | Optional profile picture |
| `password_hash` | VARCHAR(255) | bcrypt hash |
| `created_at` | DATETIME | Server default |

#### `listings`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `host_id` | INTEGER FK → users | Indexed |
| `title` | VARCHAR(255) | |
| `description` | VARCHAR(5000) | |
| `property_type` | VARCHAR(50) | APARTMENT, HOUSE, VILLA, CABIN, etc. |
| `location` | VARCHAR(255) | Human-readable city/region, indexed |
| `latitude` | FLOAT | For map display |
| `longitude` | FLOAT | For map display |
| `price_per_night` | FLOAT | CHECK ≥ 0 |
| `max_guests` | INTEGER | CHECK > 0 |
| `bedrooms` | INTEGER | |
| `beds` | INTEGER | |
| `bathrooms` | INTEGER | |
| `rating` | FLOAT | Denormalised aggregate (recalculated on review) |
| `review_count` | INTEGER | Denormalised count |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | auto-update on write |

#### `listing_images`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `listing_id` | INTEGER FK → listings | CASCADE delete |
| `image_url` | VARCHAR(500) | URL or `/uploads/` path |
| `display_order` | INTEGER | Sort order in gallery |

#### `amenities`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | VARCHAR(100) | Unique (WiFi, Pool, Kitchen, etc.) |

#### `listing_amenities` *(join table)*
| Column | Type |
|---|---|
| `listing_id` | INTEGER FK → listings (composite PK) |
| `amenity_id` | INTEGER FK → amenities (composite PK) |

#### `bookings`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `listing_id` | INTEGER FK → listings | |
| `guest_id` | INTEGER FK → users | |
| `check_in` | DATE | |
| `check_out` | DATE | |
| `guests` | INTEGER | headcount ≤ listing.max_guests |
| `nightly_price` | FLOAT | Snapshot at booking time |
| `nights` | INTEGER | check_out − check_in |
| `cleaning_fee` | FLOAT | 10% of nightly subtotal |
| `service_fee` | FLOAT | 12% of nightly subtotal |
| `total_price` | FLOAT | Sum of above |
| `status` | VARCHAR(9) | PENDING → CONFIRMED → COMPLETED / CANCELLED |
| `created_at` | DATETIME | |

#### `reviews`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `listing_id` | INTEGER FK → listings | |
| `user_id` | INTEGER FK → users | The reviewer (guest) |
| `booking_id` | INTEGER FK → bookings | One review per booking enforced |
| `rating` | INTEGER | 1–5 |
| `comment` | VARCHAR(2000) | |
| `created_at` | DATETIME | |

#### `wishlists`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | INTEGER FK → users | |
| `listing_id` | INTEGER FK → listings | |
| `created_at` | DATETIME | |

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | INTEGER FK → users | Recipient |
| `title` | VARCHAR(255) | Short subject line |
| `message` | VARCHAR(1000) | Full notification text |
| `is_read` | BOOLEAN | Default false |
| `link` | VARCHAR(500) | Optional deep-link |
| `created_at` | DATETIME | |

---

## API Overview

All endpoints are prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | No | Register a new account (returns JWT) |
| POST | `/auth/login` | No | Login (returns JWT) |
| GET | `/auth/me` | Yes | Current user's profile |
| GET | `/listings` | No | Search listings (location, dates, guests, price, type) |
| POST | `/listings` | HOST | Create a listing |
| GET | `/listings/amenities` | No | All available amenities |
| GET | `/listings/{id}` | No | Listing detail |
| PUT | `/listings/{id}` | HOST | Update a listing (must be owner) |
| DELETE | `/listings/{id}` | HOST | Delete a listing (must be owner) |
| GET | `/listings/{id}/availability` | No | Check date availability + price breakdown |
| GET | `/listings/{id}/reviews` | No | All reviews for a listing |
| POST | `/listings/{id}/reviews` | GUEST | Submit a review (requires completed/confirmed booking) |
| POST | `/bookings` | Yes | Create a booking |
| POST | `/bookings/{id}/cancel` | Yes | Cancel a booking (guest only) |
| GET | `/me/bookings` | Yes | Current user's booking history (My Trips) |
| GET | `/host/listings` | HOST | Host's own listings (dashboard) |
| GET | `/host/bookings` | HOST | Bookings received on host's listings |
| GET | `/wishlist` | Yes | Current user's saved listings |
| POST | `/wishlist/{id}` | Yes | Save a listing |
| DELETE | `/wishlist/{id}` | Yes | Unsave a listing |
| GET | `/notifications` | Yes | User's notifications |
| POST | `/notifications/read-all` | Yes | Mark all notifications as read |
| POST | `/notifications/{id}/read` | Yes | Mark one notification as read |
| POST | `/upload` | Yes | Upload an image (returns `/uploads/{filename}`) |
| GET | `/health` | No | Health check |

---

## Setup Instructions

### Prerequisites

- Python 3.11+ with `venv`
- Node.js 18+
- Docker (for RabbitMQ / Redis, or full Docker Compose setup)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd SCALER
```

### Quickstart (recommended)

The `start.sh` script handles venv creation, dependency installation, database seeding, and launching all three processes:

```bash
./start.sh        # start backend + frontend + notification worker
./start.sh stop   # stop all processes
```

Logs are written to `backend.log`, `frontend.log`, and `notification_worker.log` in the project root.

**Optional:** Start Redis and RabbitMQ via Docker first (see steps 3–4) for full caching and notifications. Both are fail-open — the app works without them.

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create the .env file
cat > .env << 'EOF'
DATABASE_URL=sqlite:///./data/airbnb.db
SECRET_KEY=change-this-to-a-random-32-char-string
RABBITMQ_URL=amqp://admin:password@localhost:5672/
REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_ENABLED=true
EOF

# Create data directory
mkdir -p data/uploads
```

### 3. Start RabbitMQ (Docker)

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management-alpine
```

RabbitMQ management UI: http://localhost:15672 (guest / guest)

### 4. Start Redis (optional — if not using hosted)

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

Or use a hosted Redis (Upstash, Redis Cloud) and update `REDIS_URL` in `.env`.

### 5. Seed the database

```bash
cd backend
python -m app.database.seed
```

This creates 8 demo users, 20 listings across India, 9 bookings, 5 reviews, and 15 amenities.

### 6. Start the backend API

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 7. Start the notification worker (separate terminal)

```bash
cd backend
.venv/bin/python -m workers.notification_worker
```

The worker consumes `BOOKING_CREATED`, `BOOKING_CANCELLED`, and `REVIEW_CREATED` events from RabbitMQ and writes notifications to the database.

### 8. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
```

Frontend available at: http://localhost:3000

---

## Docker Compose (Full Stack)

Runs the complete production-like topology: Nginx load balancer, three FastAPI replicas, notification worker, Redis, and RabbitMQ. The frontend container is also included.

```bash
# Build and start everything
DOCKER_USERNAME=yourusername docker compose up --build

# Seed the database (first run only)
docker compose exec api-1 python -m app.database.seed
```

Access:
- App: http://localhost:80 (via Nginx)
- API docs: http://localhost:80/docs
- RabbitMQ UI: http://localhost:15672 (guest / guest)

---

## Additional Documentation

- [System Design](docs/system-design.md) — architecture, middleware stack, caching, RabbitMQ flow, SQLite strategy
- [API Reference](docs/api.md) — all endpoints, request/response schemas, error codes
- [Database ERD & Schema](docs/database-erd.md) — table definitions, indexes, seed data

---

## Demo Credentials

The seed script creates these demo accounts. All use the password **`password123`**.

| Email | Role | Notes |
|---|---|---|
| priya@example.com | HOST | Has 5 listings |
| rahul@example.com | HOST | Has 4 listings |
| anjali@example.com | HOST | Has 4 listings |
| sneha@example.com | HOST | Has 4 listings |
| vikram@example.com | GUEST | Has booking history |
| meera@example.com | GUEST | Has wishlist |
| arjun@example.com | GUEST | |
| deepak@example.com | GUEST | |

---

## Key Features

### Authentication
- JWT-based (7-day expiry), stored in `localStorage`
- bcrypt password hashing
- Role-based access: `GUEST` and `HOST` — hosts can create/manage listings, guests can book

### Search & Filtering
- Full-text location search (case-insensitive LIKE)
- Date-range availability filtering (excludes listings with conflicting confirmed bookings)
- Guest count filter
- Price range filter (min/max per night)
- Property type filter
- Amenity filter (AND logic — listing must have all selected amenities)
- Paginated results (20 per page)

### Booking Flow
- Availability check with price breakdown before confirming
- Conflict detection is transactional (prevents double-booking under concurrent load)
- Pricing: nightly rate × nights + 10% cleaning fee + 12% service fee
- Bookings block dates on the listing immediately

### Host Notifications (Event-Driven)
- On booking: `BOOKING_CREATED` event published to RabbitMQ
- `notification_worker` consumes the event and inserts a notification for the host
- Same flow for `BOOKING_CANCELLED` and `REVIEW_CREATED`
- Bell icon in the header shows unread count badge in real time

### Caching (Redis)
| Resource | TTL | Invalidated when |
|---|---|---|
| Listing search results | 5 min | Any listing write |
| Listing detail | 10 min | Listing updated/deleted, new review |
| Amenities | 1 hour | Never (static data) |
| Listing reviews | 10 min | New review posted |
| Host listings | 5 min | Listing created/updated/deleted |

### Rate Limiting (Redis — Token Bucket)
| Tier | Capacity | Rate | Applies to |
|---|---|---|---|
| Global | 300 | 300 / min | Per IP — all requests |
| Auth | 10 | 5 / min | Per IP — login/signup (brute-force protection) |
| Booking writes | 10 | 10 / min | Per user — booking spam |
| Listing writes | 20 | 20 / min | Per user — listing spam |
| User (default) | 200 | 200 / min | Per authenticated user |

Returns `HTTP 429` with `Retry-After` header and JSON error body on violation.

### Image Upload
- `POST /api/v1/upload` accepts `multipart/form-data`
- Supports JPEG, PNG, WebP, GIF up to 10 MB
- Stored in `backend/data/uploads/` with UUID filename
- Served as static files at `/uploads/{filename}`

### Dark / Light Mode
- Class-based Tailwind dark mode (`html.dark`)
- Persisted to `localStorage`, respects `prefers-color-scheme` on first visit
- Sun/moon toggle in the navigation bar

---

## Assumptions & Design Decisions

### Authentication
- **Simplified auth**: There is no email verification, password reset, or OAuth. Users register with name, email, password, and role. This is sufficient for the assignment scope.
- **Role is set at signup**: A user is either a GUEST or HOST from the moment they register. Switching roles requires creating a new account. This mirrors a simplified version of Airbnb where users self-identify.
- **Payments are mocked**: The booking confirmation page shows a demo credit card. No real payment processor is integrated. Confirmation creates the booking immediately.

### Database
- **SQLite over PostgreSQL**: SQLite was chosen per the assignment specification. The ORM layer (SQLAlchemy) means migrating to PostgreSQL for production is a single config change.
- **Denormalised rating on listings**: `rating` and `review_count` are stored directly on the `listings` table and updated on every review write. This avoids an aggregate query on every listing fetch. A background recalculation job would be needed if reviews could be deleted.
- **Price snapshot in bookings**: `nightly_price` is snapshotted at booking time so historical bookings remain accurate even if the host changes the price later.
- **Fees are calculated, not configurable**: Cleaning fee (10%) and service fee (12%) are hard-coded in the pricing layer. In a real system these would be configurable per listing or platform-wide.

### Availability
- Availability is checked inside a transaction to prevent race conditions (two users booking the same dates simultaneously). Only `CONFIRMED` bookings block dates; `CANCELLED` bookings free up the dates.

### Notifications
- **Async via RabbitMQ**: Host notifications are created by a separate worker process consuming from RabbitMQ, not inline in the booking request. This keeps booking latency low and decouples the notification concern.
- **No real-time push**: The frontend polls notifications on page load / login. WebSocket or SSE for real-time badge updates is out of scope.

### Media
- **Local file storage**: Uploaded images are stored on the local filesystem. In a production deployment this should be replaced with S3 or similar cloud object storage. The upload endpoint returns a relative `/uploads/{filename}` URL which the frontend prefixes with the API base URL.
- **URL-based images also supported**: The listing form accepts both file uploads and external URLs (e.g. Unsplash), so seed data with Unsplash URLs continues to work alongside uploaded images.

### Map
- **Leaflet.js** is used for the interactive map on listing detail pages. The map tiles are OpenStreetMap (free, no API key required). In dark mode the tile layer applies a CSS `invert + hue-rotate` filter to produce a dark map aesthetic.

### Caching
- Cache is **fail-open**: if Redis is unavailable, every request falls through to the database. The site remains fully functional, just without caching.
- Search results are cached by MD5-hashing all query parameters. Any change in filters produces a different key, so filtered views are independently cached.

### Rate Limiting
- Rate limiting is also **fail-open**: if Redis is down, all requests pass through.
- Rate limiting can be disabled entirely via `RATE_LIMIT_ENABLED=false` in `.env`, which is useful during local development or testing.
- The token-bucket algorithm was chosen over fixed-window because it handles burst traffic gracefully — a user can make 10 quick booking attempts (spending their burst capacity) without being penalised for short, legitimate bursts.
