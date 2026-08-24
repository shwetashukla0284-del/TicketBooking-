# API Documentation

The backend exposes RESTful endpoints with JSON request/response payloads.

---

## Authentication

### `POST /api/auth/register`
Registers a new account.
- **Request Body:** `{ "name": "Alex", "email": "alex@example.com", "password": "password123", "role": "CUSTOMER" }`
- **Response:** `{ "success": true, "user": { ... } }`

### `POST /api/auth/login`
Authenticates a user and sets an HttpOnly session cookie.
- **Request Body:** `{ "email": "customer@ticketbooking.com", "password": "password123" }`
- **Response:** `{ "success": true, "user": { ... } }`

### `POST /api/auth/logout`
Clears session cookie.

---

## Events & Shows

### `GET /api/events`
Returns published movie and concert listings.
- **Query Params:** `type=MOVIE|CONCERT`, `search=query`

### `GET /api/events/:eventId`
Returns full event details, venue information, and show times.

---

## Seats & Holds

### `GET /api/shows/:showId/seats`
Returns seat grid layout, categories, pricing, and availability (`AVAILABLE`, `HELD`, `BOOKED`).

### `POST /api/shows/:showId/holds`
Executes an atomic seat hold reservation.
- **Request Body:** `{ "showSeatIds": ["seat-1-id", "seat-2-id"] }`
- **Response:** `{ "success": true, "holdId": "hold-uuid", "expiresAt": "2026-08-24T19:55:00Z" }`

---

## Bookings & Waitlist

### `POST /api/bookings`
Converts a valid held seat into a confirmed booking, generates QR reference, and triggers email delivery.
- **Request Body:** `{ "holdId": "hold-uuid" }`

### `POST /api/bookings/:bookingId/cancel`
Cancels a confirmed booking, releases seats to `AVAILABLE`, and triggers waitlist reallocation.

### `POST /api/shows/:showId/waitlist`
Adds user to FIFO category waitlist.
- **Request Body:** `{ "categoryId": "cat-uuid" }`

### `POST /api/waitlist/offers/:offerToken/accept`
Accepts a waitlist seat offer token and converts it into a hold for checkout.
