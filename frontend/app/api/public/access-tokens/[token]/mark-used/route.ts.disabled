import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    const response = await fetch(
      `${BACKEND_URL}/api/public/access-tokens/${token}/mark-used`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Token mark-used error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to mark token as used' 
      },
      { status: 500 }
    );
  }
}
