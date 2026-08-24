import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { joinWaitlist } from '@/lib/waitlistEngine';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Please log in to join the waitlist.' },
        { status: 401 }
      );
    }

    const { showId } = await params;
    const body = await request.json();
    const { categoryId } = body;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', message: 'Category ID is required.' },
        { status: 400 }
      );
    }

    const result = await joinWaitlist({
      showId,
      categoryId,
      userId: session.userId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Join waitlist error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to join waitlist.' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const session = await getAuthSession();
    const { showId } = await params;

    const waitlists = await prisma.waitlistEntry.findMany({
      where: {
        showId,
        ...(session ? { userId: session.userId } : {}),
      },
      include: {
        category: true,
        offers: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { queuePosition: 'asc' },
    });

    return NextResponse.json({ success: true, waitlists });
  } catch (error: any) {
    console.error('Fetch waitlist error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to fetch waitlist.' },
      { status: 500 }
    );
  }
}
