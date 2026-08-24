import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredHolds } from '@/lib/holdEngine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const { showId } = await params;

    // Sweep any expired holds prior to returning current seat statuses
    await releaseExpiredHolds();

    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        event: {
          include: { venue: true },
        },
        showSeats: {
          include: {
            venueSeat: true,
            category: true,
          },
          orderBy: [
            { venueSeat: { row: 'asc' } },
            { venueSeat: { seatNumber: 'asc' } },
          ],
        },
      },
    });

    if (!show) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Show not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      showId: show.id,
      eventTitle: show.event.title,
      venueName: show.event.venue.name,
      startTime: show.startTime,
      seats: show.showSeats.map((ss) => ({
        id: ss.id,
        venueSeatId: ss.venueSeatId,
        row: ss.venueSeat.row,
        seatNumber: ss.venueSeat.seatNumber,
        category: ss.category.name,
        categoryId: ss.categoryId,
        price: ss.price,
        status: ss.status,
        positionX: ss.venueSeat.positionX,
        positionY: ss.venueSeat.positionY,
      })),
    });
  } catch (error: any) {
    console.error('Fetch show seats error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to fetch seats.' },
      { status: 500 }
    );
  }
}
