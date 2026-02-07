import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const resolvedParams = await params;
    const activityId = resolvedParams.id;
    const templateId = resolvedParams.templateId;
    const body = await request.json();

    // Forward to backend
    const backendResponse = await fetch(`${API_URL}/activities/${activityId}/notification-templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ message: 'Failed to update template' }));
      throw new Error(errorData.message || 'Failed to update template');
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update template',
        message: 'Failed to update notification template'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const resolvedParams = await params;
    const activityId = resolvedParams.id;
    const templateId = resolvedParams.templateId;

    // Forward to backend
    const backendResponse = await fetch(`${API_URL}/activities/${activityId}/notification-templates/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Accept': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ message: 'Failed to delete template' }));
      throw new Error(errorData.message || 'Failed to delete template');
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete template',
        message: 'Failed to delete notification template'
      },
      { status: 500 }
    );
  }
}
