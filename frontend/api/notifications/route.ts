import { NextResponse } from 'next/server';

export async function GET() {
  // Return empty array for now - this will be replaced with actual notification tracking
  // when email service is integrated (SendGrid, Mailgun, etc.)
  return NextResponse.json({
    success: true,
    data: [],
    message: 'Notification tracking will be available when email service is configured'
  });
}
