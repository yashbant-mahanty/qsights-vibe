import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-templates";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;

    // Try to fetch from backend first
    try {
      const backendResponse = await fetch(`${API_URL}/activities/${activityId}/notification-templates`, {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Accept': 'application/json',
        },
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.log('Backend not available, using defaults');
    }

    // If backend not available, return default templates
    const notificationTypes = Object.keys(DEFAULT_EMAIL_TEMPLATES);
    const templates = notificationTypes.map(type => ({
      id: type,
      notification_type: type,
      subject: DEFAULT_EMAIL_TEMPLATES[type as keyof typeof DEFAULT_EMAIL_TEMPLATES].subject,
      body_html: DEFAULT_EMAIL_TEMPLATES[type as keyof typeof DEFAULT_EMAIL_TEMPLATES].body_html,
      body_text: DEFAULT_EMAIL_TEMPLATES[type as keyof typeof DEFAULT_EMAIL_TEMPLATES].body_text,
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    return NextResponse.json({
      data: templates,
      available_types: notificationTypes,
      message: 'Using default templates (backend not configured)',
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
        message: 'Failed to fetch notification templates'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const body = await request.json();

    // Forward to backend
    const backendResponse = await fetch(`${API_URL}/activities/${activityId}/notification-templates`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ message: 'Failed to save template' }));
      throw new Error(errorData.message || 'Failed to save template');
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save template',
        message: 'Failed to save notification template'
      },
      { status: 500 }
    );
  }
}
