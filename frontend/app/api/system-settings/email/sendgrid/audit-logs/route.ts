import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';

async function getAuthHeaders() {
  const cookieStore = cookies();
  const token = cookieStore.get('backend_token')?.value;
  const xsrfToken = cookieStore.get('XSRF-TOKEN')?.value;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (xsrfToken) {
    headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
  }
  
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    
    // Return empty audit logs for now
    return NextResponse.json({ 
      data: [],
      message: 'Audit logs feature coming soon'
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
