import { NextRequest, NextResponse } from 'next/server';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'do-not-reply@qsights.com';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'QSights';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text, activityId, notificationType, participantIds } = body;

    if (!SENDGRID_API_KEY) {
      return NextResponse.json(
        { error: 'SendGrid API key not configured' },
        { status: 500 }
      );
    }

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Prepare recipients
    const recipients = Array.isArray(to) 
      ? to.map((email: string) => ({ email })) 
      : [{ email: to }];

    // Send email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: recipients,
            subject: subject,
          },
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        content: [
          {
            type: 'text/html',
            value: html,
          },
          ...(text ? [{
            type: 'text/plain',
            value: text,
          }] : []),
        ],
        tracking_settings: {
          click_tracking: {
            enable: true,
          },
          open_tracking: {
            enable: true,
          },
        },
        custom_args: {
          activity_id: activityId || '',
          notification_type: notificationType || '',
          participant_ids: participantIds ? JSON.stringify(participantIds) : '',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('SendGrid error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send email via SendGrid', details: errorData },
        { status: response.status }
      );
    }

    // SendGrid returns 202 Accepted with no body on success
    const messageId = response.headers.get('x-message-id');
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully via SendGrid',
      messageId: messageId,
      recipientCount: recipients.length,
    });

  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
