import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: {
          include: {
            seats: {
              include: { category: true },
            },
          },
        },
        shows: {
          orderBy: { startTime: 'asc' },
          include: {
            showSeats: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('Fetch event details error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to fetch event details.' },
      { status: 500 }
    );
  }
}
