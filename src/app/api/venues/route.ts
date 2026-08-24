import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        seats: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, venues });
  } catch (error: any) {
    console.error('Fetch venues error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to fetch venues.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, code: 'FORBIDDEN', message: 'Admin access required to create venues.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, capacity, rows, seatsPerRow } = body;

    if (!name || !address || !capacity) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', message: 'Name, address, and capacity are required.' },
        { status: 400 }
      );
    }

    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        capacity: parseInt(capacity, 10),
        status: 'ACTIVE',
      },
    });

    // Automatically generate seat layout grid if rows & seatsPerRow are specified
    if (rows && Array.isArray(rows) && seatsPerRow) {
      // Fetch or default categories
      let categories = await prisma.seatCategory.findMany();
      if (categories.length === 0) {
        const stdCat = await prisma.seatCategory.create({ data: { name: 'Standard' } });
        categories = [stdCat];
      }

      const numSeats = parseInt(seatsPerRow, 10);
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const rowName = rows[rIdx];
        for (let sNum = 1; sNum <= numSeats; sNum++) {
          const categoryId = categories[0].id;
          await prisma.venueSeat.create({
            data: {
              venueId: venue.id,
              row: rowName,
              seatNumber: sNum,
              categoryId,
              positionX: sNum * 50,
              positionY: rIdx * 50,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, venue });
  } catch (error: any) {
    console.error('Create venue error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to create venue.' },
      { status: 500 }
    );
  }
}
