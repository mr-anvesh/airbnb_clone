# Database — ERD and Schema Reference

Database: SQLite 3 (WAL mode). ORM: SQLAlchemy 2.0.

---

## Entity-Relationship Diagram

```
users
 │
 ├──< listings (host_id)
 │        │
 │        ├──< listing_images
 │        │
 │        ├──< listing_amenities >── amenities
 │        │
 │        ├──< bookings (listing_id) ──────────────────┐
 │        │        │                                   │
 │        │        └──< reviews (booking_id, user_id) ─┘
 │        │
 │        └──< wishlists (listing_id)
 │
 ├──< bookings (guest_id)
 │
 ├──< reviews (user_id)
 │
 ├──< wishlists (user_id)
 │
 └──< notifications
```

---

## Table Definitions

### `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK, auto-increment |
| `name` | VARCHAR(255) | NOT NULL |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| `role` | VARCHAR(5) | `GUEST` or `HOST`, NOT NULL |
| `avatar_url` | VARCHAR(500) | nullable |
| `password_hash` | VARCHAR(255) | NOT NULL (bcrypt) |
| `created_at` | DATETIME | server default NOW |

---

### `listings`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `host_id` | INTEGER | FK → users.id, NOT NULL, indexed |
| `title` | VARCHAR(255) | NOT NULL |
| `description` | VARCHAR(5000) | |
| `property_type` | VARCHAR(50) | `APARTMENT` `HOUSE` `VILLA` `CABIN` `COTTAGE` `STUDIO` `TREEHOUSE` `BOAT` `LOFT` `PENTHOUSE`, indexed |
| `location` | VARCHAR(255) | NOT NULL, indexed |
| `latitude` | FLOAT | |
| `longitude` | FLOAT | |
| `price_per_night` | FLOAT | CHECK ≥ 0, indexed |
| `max_guests` | INTEGER | CHECK > 0 |
| `bedrooms` | INTEGER | |
| `beds` | INTEGER | |
| `bathrooms` | INTEGER | |
| `rating` | FLOAT | denormalised aggregate, updated on review write |
| `review_count` | INTEGER | denormalised count |
| `created_at` | DATETIME | server default |
| `updated_at` | DATETIME | auto-updated on write |

---

### `listing_images`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `listing_id` | INTEGER | FK → listings.id, CASCADE delete |
| `image_url` | VARCHAR(500) | external URL or `/uploads/{uuid}` path |
| `display_order` | INTEGER | sort order in gallery |

---

### `amenities`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL |

Seeded values: WiFi, Pool, Kitchen, Washer, Dryer, Air Conditioning, Heating, Free Parking, Hot Tub, Gym, Beach Access, Mountain View, Fireplace, BBQ Grill, Pet Friendly.

---

### `listing_amenities` *(join table)*

| Column | Type | Constraints |
|---|---|---|
| `listing_id` | INTEGER | FK → listings.id, part of composite PK |
| `amenity_id` | INTEGER | FK → amenities.id, part of composite PK |

Primary key: `(listing_id, amenity_id)`.

---

### `bookings`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `listing_id` | INTEGER | FK → listings.id, indexed |
| `guest_id` | INTEGER | FK → users.id, indexed |
| `check_in` | DATE | NOT NULL, indexed (composite with listing_id) |
| `check_out` | DATE | NOT NULL, CHECK check_out > check_in |
| `guests` | INTEGER | headcount ≤ listing.max_guests |
| `nightly_price` | FLOAT | snapshot at booking time |
| `nights` | INTEGER | check_out − check_in (days) |
| `cleaning_fee` | FLOAT | 10% of nightly subtotal |
| `service_fee` | FLOAT | 12% of nightly subtotal |
| `total_price` | FLOAT | nightly_subtotal + cleaning + service |
| `status` | VARCHAR(9) | `PENDING` → `CONFIRMED` → `COMPLETED` / `CANCELLED` |
| `created_at` | DATETIME | |

Composite index on `(listing_id, status, check_in, check_out)` for availability queries.

---

### `reviews`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `listing_id` | INTEGER | FK → listings.id, indexed |
| `user_id` | INTEGER | FK → users.id |
| `booking_id` | INTEGER | FK → bookings.id, UNIQUE (one review per booking) |
| `rating` | INTEGER | CHECK 1 ≤ rating ≤ 5 |
| `comment` | VARCHAR(2000) | |
| `created_at` | DATETIME | |

---

### `wishlists`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `user_id` | INTEGER | FK → users.id, indexed |
| `listing_id` | INTEGER | FK → listings.id |
| `created_at` | DATETIME | |

Unique constraint: `(user_id, listing_id)`.

---

### `notifications`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `user_id` | INTEGER | FK → users.id (recipient) |
| `title` | VARCHAR(255) | short subject line |
| `message` | VARCHAR(1000) | full notification text |
| `is_read` | BOOLEAN | default false |
| `link` | VARCHAR(500) | optional deep-link (e.g. `/hosting/bookings`) |
| `created_at` | DATETIME | |

---

## Key Indexes

```sql
-- users
CREATE UNIQUE INDEX ON users(email);

-- listings
CREATE INDEX ON listings(host_id);
CREATE INDEX ON listings(location);
CREATE INDEX ON listings(property_type);
CREATE INDEX ON listings(price_per_night);

-- bookings
CREATE INDEX ON bookings(listing_id);
CREATE INDEX ON bookings(guest_id);
CREATE INDEX idx_booking_availability ON bookings(listing_id, status, check_in, check_out);

-- reviews
CREATE INDEX ON reviews(listing_id);

-- wishlists
CREATE INDEX ON wishlists(user_id);
```

---

## SQLite PRAGMA Configuration

Applied on every new connection:

```sql
PRAGMA journal_mode = WAL;      -- concurrent readers, one writer
PRAGMA synchronous = NORMAL;    -- durability vs. speed balance
PRAGMA foreign_keys = ON;       -- enforce FK constraints
PRAGMA busy_timeout = 5000;     -- wait up to 5s for write lock
```

---

## Seed Data

Running `python -m app.database.seed` (or via `start.sh`) creates:

| Entity | Count |
|---|---|
| Users | 8 (4 HOSTs, 4 GUESTs) |
| Listings | 20 across India (Goa, Manali, Kerala, etc.) |
| Amenities | 15 |
| Listing images | 2–4 per listing (Unsplash URLs) |
| Bookings | 9 (mix of CONFIRMED / CANCELLED / COMPLETED) |
| Reviews | 5 |
| Wishlist entries | several |

All demo users share the password `password123`.

| Email | Role |
|---|---|
| priya@example.com | HOST |
| rahul@example.com | HOST |
| anjali@example.com | HOST |
| sneha@example.com | HOST |
| vikram@example.com | GUEST |
| meera@example.com | GUEST |
| arjun@example.com | GUEST |
| deepak@example.com | GUEST |
