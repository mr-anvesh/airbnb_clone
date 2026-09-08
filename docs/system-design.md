# System Design — Airbnb Clone

## Overview

The system is a full-stack web application with a Next.js frontend, a FastAPI backend, SQLite as the source of truth, Redis for caching, and RabbitMQ for asynchronous domain events. In production (Docker Compose), three stateless FastAPI replicas sit behind an Nginx load balancer.

---

## High-Level Architecture

```
                              USERS
                                │
                                ▼
                       ┌─────────────────┐
                       │   Nginx          │  (Docker only)
                       │  Load Balancer  │
                       └────────┬────────┘
                                │  least_conn
               ┌────────────────┼────────────────┐
               ▼                ▼                ▼
          ┌──────────┐     ┌──────────┐     ┌──────────┐
          │ FastAPI  │     │ FastAPI  │     │ FastAPI  │
          │ api-1    │     │ api-2    │     │ api-3    │
          └────┬─────┘     └────┬─────┘     └────┬─────┘
               │                │                │
           Pool(4)          Pool(4)           Pool(4)
               └────────────────┼────────────────┘
                                │
                  ┌─────────────┼──────────────┐
                  ▼             ▼              ▼
              ┌────────┐   ┌───────────┐  ┌──────────────┐
              │ Redis  │   │ RabbitMQ  │  │   SQLite     │
              │ Cache  │   │  Events   │  │ Source Truth │
              └────────┘   └─────┬─────┘  │    + WAL     │
                                  │        └──────────────┘
                                  ▼
                         ┌─────────────────┐
                         │ Notification    │
                         │ Worker          │
                         │ (notification_  │
                         │  worker.py)     │
                         └─────────────────┘

Next.js 16 (port 3000)  ←→  FastAPI (port 8000)  via HTTP/REST
```

---

## Local Development (without Docker)

```
Browser (localhost:3000)
        │  HTTP/REST  Bearer JWT
        ▼
FastAPI (localhost:8000)
        ├──► Redis       (optional — fail-open)
        ├──► RabbitMQ    (optional — fail-open)
        └──► SQLite      (data/airbnb.db)
                              ▲
                              │
              notification_worker.py
```

The `start.sh` script at the project root starts all three processes:
1. FastAPI backend on `:8000`
2. Next.js frontend on `:3000`
3. Notification worker (background)

---

## FastAPI Internal Architecture

Every HTTP request passes through a layered middleware stack before reaching a domain module:

```
HTTP Request
     │
     ▼
RequestIDMiddleware   — attaches UUID, logs method/path/status/duration
     │
     ▼
RateLimitMiddleware   — token-bucket via Redis Lua script (fail-open)
     │
     ▼
CORSMiddleware        — allow configured origin
     │
     ▼
Router (domain)
     │
     ▼
Service               — business logic, authorization, event publication
     │
     ├──────────► Redis     (cache read/write)
     ├──────────► RabbitMQ  (publish domain events)
     │
     ▼
Repository            — SQLAlchemy queries, CRUD, filters, pagination
     │
     ▼
SQLAlchemy Model
     │
     ▼
SQLite (WAL mode)
```

---

## Domain Modules

```
backend/app/
  auth/           — JWT login/signup, current-user dependency
  listings/       — CRUD, search/filter, availability, pricing
  bookings/       — create, cancel, my-trips, host bookings
  reviews/        — submit, list, aggregate rating update
  wishlist/       — save/unsave listings
  notifications/  — read, mark-read (populated by worker)
  users/          — user profile
  upload/         — multipart image upload → data/uploads/
  cache/          — Redis cache-aside abstraction
  messaging/      — RabbitMQ publisher abstraction
  core/           — shared middleware, exceptions, pagination
  database/       — SQLAlchemy engine, session, seed script
```

Each domain follows the same 4-layer pattern:

```
router.py      — FastAPI routes, HTTP concerns, cache read/write
service.py     — business rules, authorization, event triggers
repository.py  — SQLAlchemy queries, no business logic
models.py      — SQLAlchemy ORM model
schemas.py     — Pydantic v2 request/response shapes
```

---

## Critical Invariants

### Booking Availability

Availability is enforced **inside a SQLite transaction**:

```
POST /bookings
     │
     ▼
Validate request (Pydantic)
     │
     ▼
Calculate price (server-side only — never trust frontend price)
     │
     ▼
BEGIN TRANSACTION
     │
     ├─ SELECT conflicting CONFIRMED bookings
     │      WHERE listing_id = ? AND status = 'CONFIRMED'
     │        AND check_in < check_out_requested
     │        AND check_out > check_in_requested
     │
     ├─ Conflict found → ROLLBACK → HTTP 409 LISTING_NOT_AVAILABLE
     │
     └─ No conflict → INSERT booking → COMMIT
              │
              ▼
        Return HTTP 201 to client
              │
              ▼
        Publish BookingCreated → RabbitMQ
```

The frontend availability check is **only for UX** — the final booking transaction is authoritative.

### Price Calculation

The backend always calculates:

```
nightly_price × nights = nightly_subtotal
cleaning_fee  = nightly_subtotal × 0.10
service_fee   = nightly_subtotal × 0.12
total         = nightly_subtotal + cleaning_fee + service_fee
```

The `nightly_price` is snapshotted at booking time — historical bookings remain accurate even if the host later changes the price.

---

## Redis Caching

Cache-aside pattern. Redis is **fail-open** — if unavailable, requests fall through to the database.

| Key pattern | TTL | Invalidated by |
|---|---|---|
| `listing:{id}` | 10 min | Listing update/delete, new review |
| `listings:search:{md5_of_params}` | 5 min | Any listing write |
| `amenities:all` | 1 hour | Never (static) |
| `reviews:listing:{id}` | 10 min | New review on listing |
| `host:listings:{user_id}` | 5 min | Listing create/update/delete |

Search results are keyed by MD5 of all query parameters, so each unique filter combination is independently cached.

---

## Rate Limiting (Token Bucket via Redis Lua)

Rate limiting is **fail-open**. Disabled via `RATE_LIMIT_ENABLED=false`.

| Tier | Capacity | Refill | Scope |
|---|---|---|---|
| Global | 300 | 300/min | Per IP |
| Auth | 10 | 5/min | Per IP — login/signup |
| Booking writes | 10 | 10/min | Per authenticated user |
| Listing writes | 20 | 20/min | Per authenticated user |
| User (default) | 200 | 200/min | Per authenticated user |

Violations return `HTTP 429` with a `Retry-After` header.

---

## RabbitMQ Event Flow

Exchange: `domain.events` (topic, durable).

```
FastAPI service (publisher)
        │
        │  routing key: booking.created / booking.cancelled / review.created
        ▼
    RabbitMQ
        │
        ▼
    notification.queue (durable)
        │
        ▼
    notification_worker.py
        │
        ▼
    INSERT notification row → SQLite
```

Events carry enough context for consumers to act without additional DB lookups:

```json
{
  "event_type": "BookingCreated",
  "event_id": "uuid",
  "booking_id": 123,
  "listing_id": 456,
  "guest_id": 789,
  "created_at": "2026-09-08T10:00:00Z"
}
```

Worker uses **manual ack** — a message is only acknowledged after the notification row is committed. Dead-letter behaviour relies on RabbitMQ's default requeue-on-nack.

Note: SQLite commit and RabbitMQ publish are **separate operations** — there is no distributed transaction between them. A crash between commit and publish would lose the event. A full outbox pattern would address this for production.

---

## Image Uploads

Images are stored on the local filesystem at `backend/data/uploads/` with a UUID filename. The upload endpoint returns a relative URL (`/uploads/{filename}`) which the frontend prefixes with the API base URL.

Listings also accept external URLs (e.g., Unsplash) in `image_url` fields, so seed data with remote URLs works alongside uploaded images.

For production, the local storage path should be replaced with an object storage service (e.g., S3, Cloudflare R2).

---

## SQLite Configuration

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=4,
    max_overflow=0,
    pool_timeout=10,
    pool_recycle=1800,
    connect_args={"check_same_thread": False, "timeout": 5},
)
```

On every connection:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

**SQLite write serialization caveat:** Multiple FastAPI replicas share the same SQLite file. Concurrent reads scale; concurrent writes are serialized by SQLite. The architecture mitigates this by keeping write transactions short, using WAL mode, and offloading non-critical work to RabbitMQ. For heavy write loads, migrating to PostgreSQL is a single SQLAlchemy connection string change.

---

## Authentication

- JWT (HS256), 7-day expiry, stored in `localStorage`
- bcrypt password hashing
- Roles: `GUEST` and `HOST` — set at signup, not changeable
- All authorization checks are enforced server-side; the frontend role is never trusted

---

## Frontend Architecture

```
Next.js 16 App Router (TypeScript)
  │
  ├── app/                    — pages (App Router)
  │   ├── page.tsx            — home / listing grid
  │   ├── listings/[id]/      — listing detail + reservation card
  │   ├── booking/            — booking confirmation
  │   ├── trips/              — My Trips (guest bookings)
  │   ├── wishlist/           — saved listings
  │   └── hosting/            — host dashboard, create/edit listings
  │
  ├── components/             — shared UI components
  │   ├── navigation/         — Header, notifications bell
  │   ├── home/               — ListingGrid, CategoryTabs, FilterModal
  │   ├── listing/            — ImageGallery, AmenityList, Map
  │   ├── booking/            — ReservationCard, MobileReserveDrawer
  │   ├── hosting/            — ListingForm, HostDashboard
  │   ├── reviews/            — ReviewList, StarRating
  │   ├── search/             — SearchBar, DateRangePicker, GuestSelector
  │   └── ui/                 — Button, Modal, Toast, EmptyState, etc.
  │
  ├── contexts/               — AuthContext (JWT), ThemeContext (dark/light)
  ├── lib/                    — api-client.ts, utils.ts, constants.ts
  └── types/                  — shared TypeScript interfaces
```

Dark mode uses Tailwind's class-based strategy (`html.dark`), persisted in `localStorage`, with initial value from `prefers-color-scheme`.

Maps use React-Leaflet + OpenStreetMap tiles (no API key required). In dark mode a CSS `invert + hue-rotate` filter produces a dark tile aesthetic.

---

## Docker Compose Services

| Service | Image | Role |
|---|---|---|
| `frontend` | scaler-frontend | Next.js, port 3000 |
| `api-1`, `api-2`, `api-3` | scaler-backend | FastAPI replicas, port 8000 |
| `worker` | scaler-backend | Notification worker process |
| `redis` | redis:7-alpine | Cache + rate limiter |
| `rabbitmq` | rabbitmq:3-management-alpine | Message broker |

All API replicas and the worker share a single `sqlite_data` Docker volume. Nginx load balancing across replicas is configured separately via `nginx/nginx.conf`.
