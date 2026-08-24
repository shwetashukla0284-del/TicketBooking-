import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

const HOLD_TTL_MINUTES = parseInt(process.env.SEAT_HOLD_TTL_MINUTES || '10', 10);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ offerToken: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Please log in to accept this ticket offer.' },
        { status: 401 }
      );
    }

    const { offerToken } = await params;

    const offer = await prisma.waitlistOffer.findUnique({
      where: { token: offerToken },
      include: {
        waitlistEntry: true,
        showSeat: true,
      },
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Waitlist offer token is invalid.' },
        { status: 404 }
      );
    }

    if (offer.waitlistEntry.userId !== session.userId) {
      return NextResponse.json(
        { success: false, code: 'FORBIDDEN', message: 'This waitlist offer belongs to a different user.' },
        { status: 403 }
      );
    }

    if (offer.status !== 'ACTIVE' || new Date() > offer.expiresAt) {
      return NextResponse.json(
        { success: false, code: 'OFFER_EXPIRED', message: 'This waitlist offer has expired.' },
        { status: 400 }
      );
    }

    // Convert waitlist offer to an active Seat Hold inside transaction
    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);

    const hold = await prisma.$transaction(async (tx) => {
      // Update offer status
      await tx.waitlistOffer.update({
        where: { id: offer.id },
        data: { status: 'ACCEPTED' },
      });

      // Update waitlist entry status
      await tx.waitlistEntry.update({
        where: { id: offer.waitlistEntryId },
        data: { status: 'ACCEPTED' },
      });

      // Create Hold
      const newHold = await tx.hold.create({
        data: {
          userId: session.userId,
          showId: offer.showSeat.showId,
          expiresAt,
          status: 'ACTIVE',
          items: {
            create: [{ showSeatId: offer.showSeatId }],
          },
        },
      });

      // Mark seat HELD
      await tx.showSeat.update({
        where: { id: offer.showSeatId },
        data: { status: 'HELD' },
      });

      return newHold;
    });

    return NextResponse.json({
      success: true,
      message: 'Waitlist offer accepted! Redirecting to checkout...',
      holdId: hold.id,
      expiresAt: hold.expiresAt,
    });
  } catch (error: any) {
    console.error('Accept waitlist offer error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to accept waitlist offer.' },
      { status: 500 }
    );
  }
}
