# System Design & Architecture: High-Demand Ticket Booking System

## 1. System Overview

This document outlines the high-level architecture and design choices for the Ticket Booking System. The system is designed to handle high-demand ticket sales, featuring atomic seat holding, queue-based waitlists, and Role-Based Access Control (RBAC).

## 2. Technology Stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
- **Language:** TypeScript
- **Backend/API:** Next.js Server Actions & API Routes
- **Database:** SQLite (Relational)
- **ORM:** Prisma (v5.22.0)
- **Authentication:** Custom JWT-based Session Auth + `bcryptjs`

## 3. Core Engines & Mechanisms

### 3.1 Atomic Seat Hold Engine (`holdEngine.ts`)
To prevent double-booking during high traffic:
- **Optimistic Concurrency Control:** Uses a `version` field on the `ShowSeat` entity. When a user selects a seat, the system checks the version and increments it atomically.
- **Hold TTL:** Seats are placed on "Hold" for 10 minutes. If the checkout is not completed, a background process releases the hold, making the seat available again.
- **All-or-Nothing Rule:** If a user tries to hold 4 seats and only 3 are available, the entire transaction is rejected to maintain party integrity.

### 3.2 FIFO Waitlist Engine (`waitlistEngine.ts`)
- **Queueing:** Users can join a waitlist for specific `SeatCategory` levels if a show is sold out.
- **Offer Tokens:** When a booked ticket is cancelled or a hold expires, the system generates a time-limited (5-minute) `WaitlistOffer` token and emails the next user in the FIFO queue.
- **Auto-Reallocation:** If the token expires without purchase, the system automatically allocates the offer to the subsequent user in the queue.

### 3.3 QR Ticketing & Delivery
- **Generation:** Uses an SVG/DataURL QR code generator (`qrService.ts`) to encode unique booking references (e.g., `TBS-2026-XXXXXX`).
- **Delivery:** HTML email templates embedded with the generated QR code are dispatched upon successful booking (`emailService.ts`).

## 4. Database Schema (Prisma)

The database consists of 13 deeply relational entities:

- **Identity:** `User` (Roles: CUSTOMER, ORGANISER, ADMIN)
- **Venues & Events:** `Venue`, `SeatCategory`, `VenueSeat`, `Event`, `Show`
- **Inventory:** `ShowSeat` (Tracks individual seat states: AVAILABLE, HELD, BOOKED)
- **Transactions:** `Hold`, `HoldItem`, `Booking`, `BookingItem`
- **Waitlisting:** `WaitlistEntry`, `WaitlistOffer`

## 5. Security & RBAC

Access control is enforced via middleware and route protections:
- **CUSTOMER:** Can browse events, hold seats, checkout, and view their own bookings.
- **ORGANISER:** Can view sales analytics, manage venues, and schedule shows.
- **ADMIN:** Has full global access to manage all users and global settings.
