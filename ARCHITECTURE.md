# System Architecture & Technical Design

This document details the core technical mechanics of the **SeatSync Ticket Booking System**, focusing on seat-hold TTL, concurrency protection, and automated waitlist reallocation.

---

## 1. Concurrency Protection & Seat Hold Engine

High-demand ticket sales require strict guarantees that **no two users can reserve or book the same seat simultaneously**.

```text
User A (Selects A1) ──┐
                      ├─► Atomic Prisma Transaction ──► Optimistic Version Check ──► Only ONE Succeeds
User B (Selects A1) ──┘
```

### Technical Implementation
1. Each `ShowSeat` row contains a `status` (`AVAILABLE`, `HELD`, `BOOKED`) and an integer `version` field.
2. When a hold request is received for seats `[S1, S2]`, an atomic Prisma transaction verifies that all requested seats are `AVAILABLE`.
3. An atomic update operation runs:
   ```typescript
   await tx.showSeat.updateMany({
     where: { id: seat.id, status: 'AVAILABLE', version: seat.version },
     data: { status: 'HELD', version: { increment: 1 } }
   });
   ```
4. If `updated.count === 0` for any seat (indicating a race condition collision), the transaction immediately rolls back with error `CONCURRENCY_CONFLICT`.

### Partial Hold Rule ("All-or-Nothing")
For multi-seat requests (e.g. 3 seats for a family), either **all requested seats are successfully held or zero are held**.

---

## 2. Seat Hold TTL & Expiration Worker

To prevent seats from remaining locked when users abandon checkout:

```text
[Hold Created] ──► Expiry set to Now + 10 mins ──► [Countdown Timer] ──► Auto-Release to AVAILABLE
```

- Each `Hold` record tracks `expiresAt: Date`.
- Background worker `releaseExpiredHolds()` sweeps active holds where `expiresAt <= CurrentTime`, updates seats to `AVAILABLE`, and marks hold `EXPIRED`.

---

## 3. Automated Waitlist Engine & Queue Fairness

When an event category is sold out, users join a **FIFO (First-In, First-Out)** queue.

```text
[Booking Cancelled / Seat Released]
              │
              ▼
   [Check Category Waitlist]
              │
              ▼
   [Get First WAITING User]
              │
              ▼
   [Create 5-min Offer Token]
              │
      ┌───────┴───────┐
      ▼               ▼
  [Accepted]      [Expired]
      │               │
  [BOOKED]      [Next User]
```

- **Waitlist Offer TTL:** Configurable (default 5 minutes).
- **Fairness Guarantee:** Queue position ordering (`queuePosition`) is strictly preserved. Earlier queue entries always receive seat offers before later entries.
