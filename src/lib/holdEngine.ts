import { prisma } from './prisma';

const DEFAULT_HOLD_TTL_MINUTES = parseInt(process.env.SEAT_HOLD_TTL_MINUTES || '10', 10);

export interface CreateHoldParams {
  userId: string;
  showId: string;
  showSeatIds: string[];
}

export interface HoldResult {
  success: boolean;
  code?: string;
  message?: string;
  holdId?: string;
  expiresAt?: Date;
}

/**
 * Creates an atomic hold for multiple requested seats.
 * Enforces:
 * 1. Concurrency Protection (optimistic locking / atomic update)
 * 2. Partial Hold Rule ("All-or-nothing")
 * 3. Configurable TTL
 */
export async function createSeatHold(params: CreateHoldParams): Promise<HoldResult> {
  const { userId, showId, showSeatIds } = params;

  if (!showSeatIds || showSeatIds.length === 0) {
    return { success: false, code: 'INVALID_INPUT', message: 'No seats selected for hold.' };
  }

  // Calculate expiration time based on configured TTL
  const expiresAt = new Date(Date.now() + DEFAULT_HOLD_TTL_MINUTES * 60 * 1000);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. First, release any existing expired holds for this show to ensure fresh seat status
      const now = new Date();
      const expiredHolds = await tx.hold.findMany({
        where: {
          showId,
          status: 'ACTIVE',
          expiresAt: { lte: now },
        },
        include: { items: true },
      });

      for (const expHold of expiredHolds) {
        const seatIdsToRelease = expHold.items.map((it) => it.showSeatId);
        await tx.showSeat.updateMany({
          where: { id: { in: seatIdsToRelease }, status: 'HELD' },
          data: { status: 'AVAILABLE' },
        });
        await tx.hold.update({
          where: { id: expHold.id },
          data: { status: 'EXPIRED' },
        });
      }

      // 2. Fetch requested seats inside transaction to check status
      const seats = await tx.showSeat.findMany({
        where: {
          id: { in: showSeatIds },
          showId,
        },
      });

      if (seats.length !== showSeatIds.length) {
        throw new Error('INVALID_SEATS: One or more selected seats do not exist for this show.');
      }

      // 3. Verify ALL requested seats are currently AVAILABLE
      const unavailableSeats = seats.filter((s) => s.status !== 'AVAILABLE');
      if (unavailableSeats.length > 0) {
        throw new Error('SEAT_UNAVAILABLE: One or more selected seats are no longer available.');
      }

      // 4. Atomic seat state update (HELD) with optimistic version increment
      for (const seat of seats) {
        const updated = await tx.showSeat.updateMany({
          where: {
            id: seat.id,
            status: 'AVAILABLE',
            version: seat.version,
          },
          data: {
            status: 'HELD',
            version: { increment: 1 },
          },
        });

        // If any single seat update modified 0 rows (race condition collision), abort transaction!
        if (updated.count === 0) {
          throw new Error('CONCURRENCY_CONFLICT: Another user reserved seat ' + seat.id + ' simultaneously.');
        }
      }

      // 5. Create Hold record & HoldItems
      const newHold = await tx.hold.create({
        data: {
          userId,
          showId,
          expiresAt,
          status: 'ACTIVE',
          items: {
            create: showSeatIds.map((showSeatId) => ({ showSeatId })),
          },
        },
      });

      return {
        holdId: newHold.id,
        expiresAt: newHold.expiresAt,
      };
    });

    return {
      success: true,
      holdId: result.holdId,
      expiresAt: result.expiresAt,
    };
  } catch (error: any) {
    const errorMsg = error?.message || '';
    if (errorMsg.includes('SEAT_UNAVAILABLE') || errorMsg.includes('CONCURRENCY_CONFLICT')) {
      return {
        success: false,
        code: 'SEAT_UNAVAILABLE',
        message: 'One or more selected seats were just taken by another user. Please choose different seats.',
      };
    }
    if (errorMsg.includes('INVALID_SEATS')) {
      return {
        success: false,
        code: 'INVALID_SEATS',
        message: 'Invalid seats selected.',
      };
    }
    console.error('Seat hold error:', error);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to complete seat hold reservation. Please try again.',
    };
  }
}

/**
 * Background worker task to sweep and release expired holds
 */
export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date();
  let releasedCount = 0;

  try {
    const expiredHolds = await prisma.hold.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      include: { items: true },
    });

    for (const expHold of expiredHolds) {
      await prisma.$transaction(async (tx) => {
        const seatIdsToRelease = expHold.items.map((it) => it.showSeatId);

        // Reset seats to AVAILABLE
        await tx.showSeat.updateMany({
          where: {
            id: { in: seatIdsToRelease },
            status: 'HELD',
          },
          data: { status: 'AVAILABLE' },
        });

        // Update hold status
        await tx.hold.update({
          where: { id: expHold.id },
          data: { status: 'EXPIRED' },
        });

        releasedCount++;
      });
    }
  } catch (error) {
    console.error('Error releasing expired holds:', error);
  }

  return releasedCount;
}
