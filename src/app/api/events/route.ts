import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const status = searchParams.get('status') || 'PUBLISHED';

    const whereClause: any = {};
    if (status !== 'ALL') {
      whereClause.status = status;
    }
    if (type) {
      whereClause.type = type;
    }
    if (search) {
      whereClause.title = { contains: search };
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        venue: true,
        shows: {
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    console.error('Fetch events error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to fetch events.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ORGANISER' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, code: 'FORBIDDEN', message: 'Only Organisers or Admins can create events.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, type, description, venueId, imageUrl, showTimes } = body;

    if (!title || !type || !description || !venueId) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', message: 'Title, type, description, and venueId are required.' },
        { status: 400 }
      );
    }

    const newEvent = await prisma.event.create({
      data: {
        organiserId: session.userId,
        venueId,
        title,
        type,
        description,
        imageUrl: imageUrl || null,
        status: 'PUBLISHED',
      },
    });

    // Create associated shows if provided
    if (showTimes && Array.isArray(showTimes) && showTimes.length > 0) {
      const venueSeats = await prisma.venueSeat.findMany({
        where: { venueId },
      });

      for (const st of showTimes) {
        const startTime = new Date(st.startTime);
        const endTime = new Date(st.endTime || startTime.getTime() + 2 * 60 * 60 * 1000);

        const show = await prisma.show.create({
          data: {
            eventId: newEvent.id,
            startTime,
            endTime,
          },
        });

        // Auto-generate ShowSeats inventory from VenueSeats layout
        const categoryPrices = st.categoryPrices || {}; // e.g. { categoryId: price }
        const showSeatsData = venueSeats.map((vSeat) => ({
          showId: show.id,
          venueSeatId: vSeat.id,
          categoryId: vSeat.categoryId,
          price: categoryPrices[vSeat.categoryId] || 20.0,
          status: 'AVAILABLE',
        }));

        await prisma.showSeat.createMany({
          data: showSeatsData,
        });
      }
    }

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to create event.' },
      { status: 500 }
    );
  }
}
