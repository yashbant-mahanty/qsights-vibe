import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const isSecureCookie = request.nextUrl.protocol === 'https:';

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    // Clear HTTP-only cookies
    response.cookies.set({
      name: 'accessToken',
      value: '',
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    response.cookies.set({
      name: 'refreshToken',
      value: '',
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
