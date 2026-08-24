# SeatSync — Ticket Booking System

A full-stack web-based ticket booking platform built with **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **SQLite / PostgreSQL**.

The system is specifically engineered for high-concurrency booking scenarios (such as popular movie premieres and concert ticket drops), implementing atomic seat holds, automatic TTL hold releases, waitlist FIFO queues, QR digital ticket generation, and email confirmation delivery.

---

##  Key Features

### 1. Interactive Visual Seat Map
- Color-coded seat state grid (`AVAILABLE`, `SELECTED`, `HELD`, `BOOKED`).
- Category indicators (VIP Box, Premium, Standard).
- Real-time seat inventory updates and price calculations.

### 2. Concurrency Protection & Seat Hold Engine
- **Zero Double-Booking Guarantee:** Atomic database transactions (`$transaction`) with optimistic row-version locking (`version` field) ensure two users can never hold or book the same seat.
- **Partial Hold Rule ("All-or-Nothing"):** Multi-seat reservations succeed only if all requested seats are available; otherwise, the transaction safely rolls back.
- **Configurable Hold TTL:** Temporary seat holds automatically expire after a configurable period (default: 10 minutes).
- **Hold Expiration Worker:** Sweeps expired holds and releases seats back to the available pool.

### 3. Automated Waitlist Queue Engine
- **FIFO Queue:** Customers join category-specific waitlists when an event or category is sold out.
- **Automatic Seat Reallocation:** When a booking is cancelled or a hold expires, the system automatically offers the seat to the next customer in queue.
- **Offer TTL:** Offers include a time-limited token (default: 5 minutes). If expired, allocation automatically falls back to the next waitlisted customer.

### 4. Digital QR Ticketing & Email Delivery
- Unique booking references generated for every confirmed ticket (e.g., `TBS-2026-AB12CD`).
- Server-side and client-side QR Code SVG / DataURL rendering for venue gate check-in.
- Automatic HTML email delivery with embedded QR ticket pass.

### 5. Role-Based Access Control (RBAC) & Dashboards
- **Customer:** Browse events, select seats, complete checkout, view ticket history, cancel bookings, join waitlists.
- **Organiser:** Create movie/concert listings, configure showtimes & category pricing, monitor occupancy rates & gross revenue analytics.
- **Admin:** Manage venues, capacity, and visual seat layout grids.

---

##  Quick Start & Installation

### Prerequisites
- **Node.js**: v18.x or later
- **npm**: v9.x or later

### Installation Steps

1. **Clone/Navigate to Project Root:**
   ```bash
   cd "ticket booking"
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file (copied from `.env.example`):
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="ticket-booking-secret-key-2026"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   SEAT_HOLD_TTL_MINUTES=10
   WAITLIST_OFFER_TTL_MINUTES=5
   ```

4. **Initialize Database & Seed Sample Data:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Start Local Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

##  Demo Account Credentials

| Role | Email | Password | Access Privileges |
|---|---|---|---|
| **Customer** | `customer@ticketbooking.com` | `password123` | Book tickets, view QR passes, cancel bookings |
| **Organiser** | `organiser@ticketbooking.com` | `password123` | Event creation, revenue & occupancy analytics |
| **Admin** | `admin@ticketbooking.com` | `password123` | Venue & seat layout management |

---

##  Technical Architecture & Docs

For detailed design write-ups, see:
- [`ARCHITECTURE.md`](file:///c:/Users/DELL/Desktop/ticket%20booking/ARCHITECTURE.md) — Concurrency protection, TTL worker, & waitlist algorithm design.
- [`DATABASE.md`](file:///c:/Users/DELL/Desktop/ticket%20booking/DATABASE.md) — Entity Relationship Diagram & Schema model specification.
- [`API.md`](file:///c:/Users/DELL/Desktop/ticket%20booking/API.md) — Complete REST API contract documentation.
