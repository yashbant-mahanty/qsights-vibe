import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const csrfToken = request.headers.get('X-XSRF-TOKEN');
    const body = await request.json();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
    
    const response = await fetch(`${BACKEND_API_URL}/system-settings/test-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error testing email:', error);
    return NextResponse.json({ error: 'Failed to test email' }, { status: 500 });
  }
}

