import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  getRedirectUrl,
} from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function POST(request: NextRequest) {
  try {
    const isSecureCookie = request.nextUrl.protocol === 'https:';
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('Attempting backend login:', `${API_URL}/auth/login`);

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || 'Invalid credentials' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const { user, token } = data;

    const tokenPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      programId: user.programId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    const redirectUrl = getRedirectUrl(user.role);
    
    const nextResponse = NextResponse.json(
      {
        success: true,
        user: {
          id: user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          programId: user.programId,
        },
        redirectUrl,
      },
      { status: 200 }
    );

    nextResponse.cookies.set({
      name: 'accessToken',
      value: accessToken,
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    nextResponse.cookies.set({
      name: 'refreshToken',
      value: refreshToken,
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    nextResponse.cookies.set({
      name: 'backendToken',
      value: token,
      httpOnly: false,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return nextResponse;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
