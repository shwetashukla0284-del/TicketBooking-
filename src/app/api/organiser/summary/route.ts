import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ORGANISER' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, code: 'FORBIDDEN', message: 'Organiser or Admin access required.' },
        { status: 403 }
      );
    }

    const whereEvent = session.role === 'ADMIN' ? {} : { organiserId: session.userId };

    const events = await prisma.event.findMany({
      where: whereEvent,
      include: {
        shows: {
          include: {
            bookings: {
              where: { status: 'CONFIRMED' },
              include: {
                items: {
                  include: {
                    showSeat: { include: { category: true } },
                  },
                },
              },
            },
            showSeats: true,
          },
        },
      },
    });

    let totalEvents = events.length;
    let publishedEvents = events.filter((e) => e.status === 'PUBLISHED').length;
    let totalTicketsSold = 0;
    let totalSeatCapacity = 0;
    let grossRevenue = 0;

    const eventSummaries = events.map((event) => {
      let eventRevenue = 0;
      let eventTicketsSold = 0;
      let eventCapacity = 0;

      for (const show of event.shows) {
        eventCapacity += show.showSeats.length;
        for (const booking of show.bookings) {
          eventRevenue += booking.totalAmount;
          eventTicketsSold += booking.items.length;
        }
      }

      totalTicketsSold += eventTicketsSold;
      totalSeatCapacity += eventCapacity;
      grossRevenue += eventRevenue;

      const occupancyRate = eventCapacity > 0 ? Math.round((eventTicketsSold / eventCapacity) * 100) : 0;

      return {
        id: event.id,
        title: event.title,
        type: event.type,
        status: event.status,
        ticketsSold: eventTicketsSold,
        capacity: eventCapacity,
        occupancyRate,
        revenue: eventRevenue,
      };
    });

    const overallOccupancyRate = totalSeatCapacity > 0 ? Math.round((totalTicketsSold / totalSeatCapacity) * 100) : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        totalEvents,
        publishedEvents,
        totalTicketsSold,
        grossRevenue,
        overallOccupancyRate,
      },
      eventSummaries,
    });
  } catch (error: any) {
    console.error('Fetch organiser summary error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to fetch revenue summary.' },
      { status: 500 }
    );
  }
}
