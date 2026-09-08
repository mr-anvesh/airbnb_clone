# API Reference

All endpoints are prefixed with `/api/v1`. Protected routes require:

```
Authorization: Bearer <jwt_token>
```

Errors follow a consistent shape:

```json
{
  "error": {
    "code": "LISTING_NOT_AVAILABLE",
    "message": "The selected dates are no longer available.",
    "request_id": "abc123"
  }
}
```

---

## Authentication

### POST `/api/v1/auth/signup`

Register a new account.

**Body**
```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "password123",
  "role": "HOST"
}
```
`role`: `"HOST"` or `"GUEST"`

**Response 201**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": 1, "name": "Priya Sharma", "email": "...", "role": "HOST" }
}
```

---

### POST `/api/v1/auth/login`

**Body**
```json
{ "email": "priya@example.com", "password": "password123" }
```

**Response 200** — same shape as signup.

---

### GET `/api/v1/auth/me`

Returns the authenticated user's profile.

**Auth required.** Response: user object.

---

## Listings

### GET `/api/v1/listings`

Search and filter listings. All parameters are optional.

| Parameter | Type | Description |
|---|---|---|
| `location` | string | Case-insensitive substring match on `location` |
| `check_in` | date (`YYYY-MM-DD`) | Exclude listings with conflicting bookings |
| `check_out` | date (`YYYY-MM-DD`) | Required with `check_in` |
| `guests` | integer | Minimum `max_guests` on listing |
| `min_price` | float | Minimum `price_per_night` |
| `max_price` | float | Maximum `price_per_night` |
| `property_type` | string | `APARTMENT`, `HOUSE`, `VILLA`, `CABIN`, etc. |
| `amenities` | integer list | Listing must have ALL listed amenity IDs |
| `page` | integer (default 1) | Pagination page |
| `page_size` | integer (default 20) | Results per page |

**Response 200**
```json
{
  "items": [ { ...listing }, ... ],
  "page": 1,
  "page_size": 20,
  "total": 43,
  "has_next": true
}
```

---

### GET `/api/v1/listings/amenities`

Returns all available amenities.

**Response 200**
```json
[{ "id": 1, "name": "WiFi" }, { "id": 2, "name": "Pool" }, ...]
```

---

### GET `/api/v1/listings/{id}`

Returns full listing detail including images, amenities, host info, and aggregate rating.

---

### POST `/api/v1/listings`

Create a listing. **Auth required — HOST role.**

**Body**
```json
{
  "title": "Beachfront Villa",
  "description": "...",
  "property_type": "VILLA",
  "location": "Goa, India",
  "latitude": 15.2993,
  "longitude": 74.124,
  "price_per_night": 8500,
  "max_guests": 6,
  "bedrooms": 3,
  "beds": 4,
  "bathrooms": 2,
  "amenities": [1, 2, 5],
  "images": [
    { "image_url": "https://example.com/img.jpg", "display_order": 0 }
  ]
}
```

**Response 201** — full listing object.

---

### PUT `/api/v1/listings/{id}`

Update a listing. **Auth required — must be the listing's host.**

Body accepts the same fields as POST (all optional).

---

### DELETE `/api/v1/listings/{id}`

Delete a listing and cascade its images, amenity links, and related records.  
**Auth required — must be the listing's host.**

**Response 204**

---

### GET `/api/v1/listings/{id}/availability`

Check availability and get a price breakdown for the requested dates.

| Parameter | Type | Required |
|---|---|---|
| `check_in` | date | Yes |
| `check_out` | date | Yes |
| `guests` | integer | Yes |

**Response 200**
```json
{
  "available": true,
  "nights": 4,
  "nightly_price": 8500,
  "nightly_subtotal": 34000,
  "cleaning_fee": 3400,
  "service_fee": 4080,
  "total": 41480
}
```

`available: false` if dates conflict with an existing CONFIRMED booking.

---

### GET `/api/v1/listings/{id}/reviews`

Returns all reviews for the listing with reviewer name and rating.

---

### POST `/api/v1/listings/{id}/reviews`

Submit a review. **Auth required.**  
The reviewer must have a CONFIRMED or COMPLETED booking for this listing.  
One review per booking is enforced.

**Body**
```json
{
  "booking_id": 12,
  "rating": 5,
  "comment": "Wonderful stay!"
}
```

**Response 201** — review object. Listing's `rating` and `review_count` are updated immediately.

---

## Bookings

### POST `/api/v1/bookings`

Create a booking. **Auth required.**

**Body**
```json
{
  "listing_id": 3,
  "check_in": "2026-10-10",
  "check_out": "2026-10-14",
  "guests": 2
}
```

Price is **calculated server-side** — the frontend never sends a total.

**Response 201** — booking object with full price breakdown.

**Errors**
- `409 LISTING_NOT_AVAILABLE` — conflicting CONFIRMED booking exists
- `422 INVALID_DATE_RANGE` — check_out ≤ check_in
- `422 INVALID_GUEST_COUNT` — guests exceeds listing max_guests

---

### POST `/api/v1/bookings/{id}/cancel`

Cancel a booking. **Auth required — must be the booking's guest.**

**Response 200** — updated booking with `status: "CANCELLED"`.

---

## My Trips

### GET `/api/v1/me/bookings`

Returns all bookings for the authenticated user, newest first, with listing and host info.

---

## Host

### GET `/api/v1/host/listings`

Returns all listings owned by the authenticated host (cached 5 min). **HOST required.**

---

### GET `/api/v1/host/bookings`

Returns all bookings received on the host's listings, with guest info. **HOST required.**

---

## Wishlist

### GET `/api/v1/wishlist`

Returns the authenticated user's saved listings. **Auth required.**

---

### POST `/api/v1/wishlist/{listing_id}`

Save a listing. **Auth required.**

**Response 201** or `409` if already saved.

---

### DELETE `/api/v1/wishlist/{listing_id}`

Unsave a listing. **Auth required.**

**Response 204**

---

## Notifications

### GET `/api/v1/notifications`

Returns all notifications for the authenticated user, newest first. **Auth required.**

```json
[
  {
    "id": 1,
    "title": "New booking received",
    "message": "Vikram Kumar booked Beachfront Villa for Oct 10–14.",
    "is_read": false,
    "link": "/hosting/bookings",
    "created_at": "2026-09-08T10:00:00Z"
  }
]
```

---

### POST `/api/v1/notifications/read-all`

Mark all of the authenticated user's notifications as read. **Auth required.**

---

### POST `/api/v1/notifications/{id}/read`

Mark a single notification as read. **Auth required.**

---

## Upload

### POST `/api/v1/upload`

Upload an image. **Auth required.**

**Request** — `multipart/form-data` with field `file`.

Accepted: JPEG, PNG, WebP, GIF. Max size: 10 MB.

**Response 200**
```json
{ "url": "/uploads/3f2e1a.jpg" }
```

The URL is relative to the API base URL. The frontend constructs the full URL as `NEXT_PUBLIC_API_URL + url`.

---

## Health

### GET `/health`

```json
{ "status": "ok" }
```

Used by the Nginx upstream health checks.

---

## Common Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `LISTING_NOT_FOUND` | 404 | Listing ID does not exist |
| `BOOKING_NOT_FOUND` | 404 | Booking ID does not exist |
| `LISTING_NOT_AVAILABLE` | 409 | Date conflict with existing booking |
| `INVALID_DATE_RANGE` | 422 | check_out ≤ check_in |
| `INVALID_GUEST_COUNT` | 422 | Guest count exceeds listing capacity |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Authenticated but not allowed (e.g., wrong role) |
| `HOST_OWNERSHIP_REQUIRED` | 403 | Not the host of this listing |
| `REVIEW_NOT_ALLOWED` | 403 | No eligible booking for this listing |
| `RATE_LIMIT_EXCEEDED` | 429 | Token bucket exhausted; see `Retry-After` header |
