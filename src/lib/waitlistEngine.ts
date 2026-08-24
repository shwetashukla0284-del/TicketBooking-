import { prisma } from './prisma';
import crypto from 'crypto';

const DEFAULT_OFFER_TTL_MINUTES = parseInt(process.env.WAITLIST_OFFER_TTL_MINUTES || '5', 10);

export interface WaitlistJoinParams {
  showId: string;
  categoryId: string;
  userId: string;
}

/**
 * Adds a customer to the FIFO waitlist for a specific show and seat category.
 */
export async function joinWaitlist(params: WaitlistJoinParams) {
  const { showId, categoryId, userId } = params;

  // Check if user is already waiting on this waitlist
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      showId,
      categoryId,
      userId,
      status: { in: ['WAITING', 'OFFERED'] },
    },
  });

  if (existing) {
    return {
      success: false,
      code: 'ALREADY_WAITLISTED',
      message: 'You are already on the waitlist for this category.',
      position: existing.queuePosition,
    };
  }

  // Get current max queue position
  const lastEntry = await prisma.waitlistEntry.findFirst({
    where: { showId, categoryId },
    orderBy: { queuePosition: 'desc' },
  });

  const queuePosition = (lastEntry?.queuePosition || 0) + 1;

  const entry = await prisma.waitlistEntry.create({
    data: {
      showId,
      categoryId,
      userId,
      queuePosition,
      status: 'WAITING',
    },
  });

  return {
    success: true,
    entry,
    position: queuePosition,
  };
}

/**
 * Triggers waitlist processing for a released seat.
 * Finds the first WAITING user in FIFO queue order, creates a 5-minute offer token,
 * and updates waitlist entry status to OFFERED.
 */
export async function processWaitlistForSeat(showSeatId: string) {
  try {
    const showSeat = await prisma.showSeat.findUnique({
      where: { id: showSeatId },
    });

    if (!showSeat || showSeat.status !== 'AVAILABLE') {
      return null;
    }

    // First sweep expired waitlist offers
    await sweepExpiredWaitlistOffers();

    // Find first WAITING entry in queue order (FIFO)
    const firstWaiting = await prisma.waitlistEntry.findFirst({
      where: {
        showId: showSeat.showId,
        categoryId: showSeat.categoryId,
        status: 'WAITING',
      },
      orderBy: { queuePosition: 'asc' },
    });

    if (!firstWaiting) {
      return null; // No one in waitlist queue
    }

    const offerExpiresAt = new Date(Date.now() + DEFAULT_OFFER_TTL_MINUTES * 60 * 1000);
    const offerToken = crypto.randomBytes(24).toString('hex');

    const result = await prisma.$transaction(async (tx) => {
      // Temporarily mark seat as HELD for waitlist offer
      await tx.showSeat.update({
        where: { id: showSeatId },
        data: { status: 'HELD' },
      });

      // Update waitlist entry to OFFERED
      await tx.waitlistEntry.update({
        where: { id: firstWaiting.id },
        data: { status: 'OFFERED' },
      });

      // Create WaitlistOffer record
      const offer = await tx.waitlistOffer.create({
        data: {
          waitlistEntryId: firstWaiting.id,
          showSeatId,
          token: offerToken,
          expiresAt: offerExpiresAt,
          status: 'ACTIVE',
        },
      });

      return offer;
    });

    console.log(`🎟️ Waitlist offer generated for user ${firstWaiting.userId} (Token: ${offerToken})`);
    return result;
  } catch (error) {
    console.error('Waitlist processing error:', error);
    return null;
  }
}

/**
 * Sweeps expired waitlist offers and moves allocation to the next user in line
 */
export async function sweepExpiredWaitlistOffers(): Promise<number> {
  const now = new Date();
  let processedCount = 0;

  try {
    const expiredOffers = await prisma.waitlistOffer.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      include: {
        waitlistEntry: true,
      },
    });

    for (const offer of expiredOffers) {
      await prisma.$transaction(async (tx) => {
        // Mark offer as EXPIRED
        await tx.waitlistOffer.update({
          where: { id: offer.id },
          data: { status: 'EXPIRED' },
        });

        // Mark waitlist entry as EXPIRED
        await tx.waitlistEntry.update({
          where: { id: offer.waitlistEntryId },
          data: { status: 'EXPIRED' },
        });

        // Release seat back to AVAILABLE
        await tx.showSeat.update({
          where: { id: offer.showSeatId },
          data: { status: 'AVAILABLE' },
        });
      });

      // Re-trigger waitlist processing for the next eligible customer
      await processWaitlistForSeat(offer.showSeatId);
      processedCount++;
    }
  } catch (error) {
    console.error('Error sweeping expired waitlist offers:', error);
  }

  return processedCount;
}
