import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function GET(request: NextRequest) {
  try {
    // Available placeholders for email templates
    const placeholders = [
      'activity_name',
      'activity_link',
      'participant_name',
      'program_name',
      'organization_name',
      'end_date',
      'start_date',
    ];

    return NextResponse.json({
      data: placeholders,
      message: 'Placeholders retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching placeholders:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch placeholders',
        message: 'Failed to fetch placeholders'
      },
      { status: 500 }
    );
  }
}
