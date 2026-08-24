import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createSeatHold } from '@/lib/holdEngine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Please log in to reserve seats.' },
        { status: 401 }
      );
    }

    const { showId } = await params;
    const body = await request.json();
    const { showSeatIds } = body;

    if (!showSeatIds || !Array.isArray(showSeatIds) || showSeatIds.length === 0) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', message: 'Select at least one seat to hold.' },
        { status: 400 }
      );
    }

    const result = await createSeatHold({
      userId: session.userId,
      showId,
      showSeatIds,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Create hold endpoint error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to create seat hold.' },
      { status: 500 }
    );
  }
}
