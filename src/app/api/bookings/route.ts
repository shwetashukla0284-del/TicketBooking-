import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { sendTicketConfirmationEmail } from '@/lib/emailService';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { holdId } = body;

    if (!holdId) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', message: 'Hold ID is required to complete booking.' },
        { status: 400 }
      );
    }

    // Process Booking inside an atomic transaction
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Fetch hold and verify ownership & status
      const hold = await tx.hold.findUnique({
        where: { id: holdId },
        include: {
          items: {
            include: {
              showSeat: {
                include: {
                  venueSeat: true,
                  category: true,
                },
              },
            },
          },
          show: {
            include: {
              event: {
                include: { venue: true },
              },
            },
          },
        },
      });

      if (!hold) {
        throw new Error('HOLD_NOT_FOUND: Reserved seat hold was not found.');
      }

      if (hold.userId !== session.userId) {
        throw new Error('FORBIDDEN: You do not own this seat hold.');
      }

      if (hold.status !== 'ACTIVE') {
        throw new Error('HOLD_EXPIRED: Your seat hold is no longer active.');
      }

      if (new Date() > hold.expiresAt) {
        // Mark hold expired
        await tx.hold.update({
          where: { id: hold.id },
          data: { status: 'EXPIRED' },
        });

        // Release seats
        const seatIds = hold.items.map((it) => it.showSeatId);
        await tx.showSeat.updateMany({
          where: { id: { in: seatIds }, status: 'HELD' },
          data: { status: 'AVAILABLE' },
        });

        throw new Error('HOLD_EXPIRED: Your seat hold countdown reached zero before checkout was completed.');
      }

      // 2. Generate unique booking reference (e.g., TBS-2026-8A3B12)
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const reference = `TBS-2026-${randomSuffix}`;

      // Calculate total amount
      const totalAmount = hold.items.reduce((sum, item) => sum + item.showSeat.price, 0);

      // 3. Create Booking record & BookingItems
      const newBooking = await tx.booking.create({
        data: {
          reference,
          userId: session.userId,
          showId: hold.showId,
          totalAmount,
          status: 'CONFIRMED',
          items: {
            create: hold.items.map((item) => ({
              showSeatId: item.showSeatId,
              price: item.showSeat.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              showSeat: {
                include: { venueSeat: true },
              },
            },
          },
          show: {
            include: {
              event: {
                include: { venue: true },
              },
            },
          },
        },
      });

      // 4. Update seats from HELD to BOOKED
      const seatIds = hold.items.map((it) => it.showSeatId);
      await tx.showSeat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: 'BOOKED' },
      });

      // 5. Mark Hold as COMPLETED
      await tx.hold.update({
        where: { id: hold.id },
        data: { status: 'COMPLETED' },
      });

      return newBooking;
    });

    // 6. Asynchronously trigger confirmation email with QR code
    const seatsFormatted = booking.items.map(
      (it) => `Row ${it.showSeat.venueSeat.row} - Seat ${it.showSeat.venueSeat.seatNumber}`
    );

    sendTicketConfirmationEmail({
      toEmail: session.email,
      customerName: session.name,
      bookingReference: booking.reference,
      eventTitle: booking.show.event.title,
      venueName: booking.show.event.venue.name,
      showTime: new Date(booking.show.startTime).toLocaleString(),
      seats: seatsFormatted,
      totalAmount: booking.totalAmount,
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        eventTitle: booking.show.event.title,
        venueName: booking.show.event.venue.name,
        showTime: booking.show.startTime,
        totalAmount: booking.totalAmount,
        seats: seatsFormatted,
      },
    });
  } catch (error: any) {
    const errorMsg = error?.message || '';
    if (errorMsg.includes('HOLD_EXPIRED')) {
      return NextResponse.json(
        { success: false, code: 'HOLD_EXPIRED', message: 'Your seat hold expired. Please select your seats again.' },
        { status: 400 }
      );
    }
    if (errorMsg.includes('FORBIDDEN')) {
      return NextResponse.json(
        { success: false, code: 'FORBIDDEN', message: 'Unauthorized hold access.' },
        { status: 403 }
      );
    }
    console.error('Booking confirmation error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to confirm booking.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: session.userId },
      include: {
        show: {
          include: {
            event: { include: { venue: true } },
          },
        },
        items: {
          include: {
            showSeat: { include: { venueSeat: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    console.error('Fetch booking history error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to fetch booking history.' },
      { status: 500 }
    );
  }
}
