# Database Schema & Entity Documentation

The database uses Prisma ORM mapping to SQLite (or PostgreSQL).

---

## Data Models Summary

- **`User`**: Account details and role (`CUSTOMER`, `ORGANISER`, `ADMIN`).
- **`Venue`**: Name, address, capacity, status.
- **`SeatCategory`**: Pricing tiers (VIP Box, Premium, Standard).
- **`VenueSeat`**: Physical seat coordinates (`row`, `seatNumber`, `positionX`, `positionY`).
- **`Event`**: Title, type (`MOVIE`, `CONCERT`), description, status.
- **`Show`**: Event occurrence with `startTime` and `endTime`.
- **`ShowSeat`**: Show seat inventory instance tracking real-time `status` (`AVAILABLE`, `HELD`, `BOOKED`), price, and optimistic lock `version`.
- **`Hold` & `HoldItem`**: Active seat hold session with `expiresAt` countdown.
- **`Booking` & `BookingItem`**: Confirmed ticket reference, total amount, status (`CONFIRMED`, `CANCELLED`).
- **`WaitlistEntry` & `WaitlistOffer`**: FIFO waitlist queue position and 5-minute time-limited offer token.
