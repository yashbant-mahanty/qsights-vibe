import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const backendToken = request.cookies.get('backendToken')?.value;

    if (!backendToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const programId = params.programId;

    // Fetch program with statistics
    const response = await fetch(`${API_URL}/programs/${programId}?with=organization&withCount=participants,activities`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Program API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
