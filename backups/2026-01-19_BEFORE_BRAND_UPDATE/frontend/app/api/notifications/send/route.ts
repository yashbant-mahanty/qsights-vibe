import { NextRequest, NextResponse } from "next/server";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'do-not-reply@qsights.com';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'QSights';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activityId, activityName, notificationType, language, mode, email, link } = body;

    // Validate required fields
    if (!activityId || !notificationType) {
      return NextResponse.json(
        { error: "Missing required fields: activityId, notificationType" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured. Please set SENDGRID_API_KEY in .env file.');
      return NextResponse.json(
        { error: "SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable." },
        { status: 500 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Ensure we have a proper activity link
    const frontendURL = process.env.NEXT_PUBLIC_APP_URL || 
                       process.env.NEXTAUTH_URL || 
                       'http://localhost:3000';
    
    const activityLink = link || `${frontendURL}/activities/take/${activityId}?mode=${mode || 'participant'}`;

    // Get email template
    const templateResponse = await fetch(`${frontendURL}/api/activities/${activityId}/notification-templates/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_type: notificationType,
        activity_name: activityName,
        activity_link: activityLink,
      }),
    });

    if (!templateResponse.ok) {
      throw new Error('Failed to generate email template');
    }

    const template = await templateResponse.json();

    // Send via SendGrid
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: email }],
            subject: template.subject || `Notification from ${activityName}`,
          },
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        content: [
          {
            type: 'text/html',
            value: template.body_html || template.html || '<p>No content</p>',
          },
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true },
        },
        custom_args: {
          activity_id: activityId,
          notification_type: notificationType,
        },
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error('SendGrid API error:', {
        status: sendGridResponse.status,
        statusText: sendGridResponse.statusText,
        error: errorText,
        to: email,
        from: SENDGRID_FROM_EMAIL
      });
      
      // Parse SendGrid error for more details
      let errorMessage = `SendGrid API returned status ${sendGridResponse.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorMessage = errorJson.errors.map((e: any) => e.message).join(', ');
        }
      } catch (e) {
        // Error text is not JSON
      }
      
      throw new Error(errorMessage);
    }

    console.log('Email sent successfully via SendGrid:', {
      to: email,
      subject: template.subject,
      activityId,
      notificationType
    });

    return NextResponse.json({
      message: "Notification sent successfully via SendGrid",
      success: true,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
