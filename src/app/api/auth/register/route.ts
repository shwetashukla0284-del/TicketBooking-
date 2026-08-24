import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', message: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userRole = role === 'ORGANISER' ? 'ORGANISER' : 'CUSTOMER';

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: userRole,
      },
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = signToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      user: tokenPayload,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Failed to create account.' },
      { status: 500 }
    );
  }
}
