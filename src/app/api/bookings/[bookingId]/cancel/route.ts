import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { processWaitlistForSeat } from '@/lib/waitlistEngine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Booking not found.' },
        { status: 404 }
      );
    }

    if (booking.userId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, code: 'FORBIDDEN', message: 'You do not have permission to cancel this booking.' },
        { status: 403 }
      );
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, code: 'ALREADY_CANCELLED', message: 'This booking has already been cancelled.' },
        { status: 400 }
      );
    }

    const releasedSeatIds: string[] = [];

    // Perform atomic cancellation
    await prisma.$transaction(async (tx) => {
      // 1. Mark booking as CANCELLED
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // 2. Return seats to AVAILABLE
      const seatIds = booking.items.map((it) => it.showSeatId);
      await tx.showSeat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: 'AVAILABLE' },
      });

      releasedSeatIds.push(...seatIds);
    });

    // 3. Trigger automatic Waitlist Queue processing for released seats!
    for (const seatId of releasedSeatIds) {
      await processWaitlistForSeat(seatId);
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully. Released seats have been offered to waitlisted customers.',
    });
  } catch (error: any) {
    console.error('Booking cancellation error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to cancel booking.' },
      { status: 500 }
    );
  }
}
