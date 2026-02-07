import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_EMAIL_TEMPLATES, generateActivityLink, replacePlaceholders } from "@/lib/email-templates";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const activityId = resolvedParams.id;
    const body = await request.json();
    const { notification_type, subject, body_html, body_text } = body;

    // Get activity details to generate proper link
    const activityResponse = await fetch(`${API_URL}/activities/${activityId}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Accept': 'application/json',
      },
    });

    if (!activityResponse.ok) {
      throw new Error('Failed to fetch activity details');
    }

    const activityData = await activityResponse.json();
    const activity = activityData.data || activityData;

    // Generate activity link with proper base URL
    const frontendURL = process.env.NEXT_PUBLIC_APP_URL || 
                       process.env.NEXTAUTH_URL || 
                       'http://localhost:3000';
    
    const activityLink = `${frontendURL}/activities/take/${activityId}?mode=participant`;

    // Prepare sample data for preview
    const sampleData = {
      activity_name: activity.name || 'Demo Activity',
      activity_link: activityLink,
      participant_name: 'John Doe',
      program_name: activity.program?.name || 'Demo Program',
      organization_name: activity.organization?.name || 'Demo Organization',
      end_date: activity.end_date ? new Date(activity.end_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'N/A',
      start_date: activity.start_date ? new Date(activity.start_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'N/A',
    };

    // Use provided template or default
    let templateSubject = subject;
    let templateBodyHtml = body_html;
    let templateBodyText = body_text;

    // If no template provided, use defaults
    if (!templateSubject || !templateBodyHtml) {
      const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[notification_type as keyof typeof DEFAULT_EMAIL_TEMPLATES];
      if (defaultTemplate) {
        templateSubject = templateSubject || defaultTemplate.subject;
        templateBodyHtml = templateBodyHtml || defaultTemplate.body_html;
        templateBodyText = templateBodyText || defaultTemplate.body_text;
      }
    }

    // Replace placeholders with sample data
    const previewSubject = replacePlaceholders(templateSubject || '', sampleData);
    const previewBodyHtml = replacePlaceholders(templateBodyHtml || '', sampleData);
    const previewBodyText = replacePlaceholders(templateBodyText || '', sampleData);

    return NextResponse.json({
      preview: {
        subject: previewSubject,
        body_html: previewBodyHtml,
        body_text: previewBodyText,
      },
      sample_data: sampleData,
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate preview',
        message: 'Failed to generate email preview'
      },
      { status: 500 }
    );
  }
}
