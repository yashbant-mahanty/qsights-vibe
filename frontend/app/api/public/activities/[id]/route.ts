import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    
    // Get preview parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const isPreview = searchParams.get('preview') === 'true';
    
    // Build URL with preview parameter
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/public/activities/${activityId}`);
    if (isPreview) {
      url.searchParams.set('preview', 'true');
    }

    // Fetch public activity data from backend (includes questionnaire with sections and questions)
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Activity not found" },
          { status: 404 }
        );
      }
      throw new Error("Failed to fetch activity");
    }

    const data = await response.json();

    // Log the questionnaire data to verify settings are included
    if (data.data?.questionnaire?.sections) {
      console.log('[PublicActivities API] Questionnaire loaded with sections:', 
        data.data.questionnaire.sections.length,
        'Sample question settings:', 
        data.data.questionnaire.sections[0]?.questions?.[0]?.settings
      );
    }

    return NextResponse.json({
      message: "Activity fetched successfully",
      data: data.data || data,
    });
  } catch (error) {
    console.error("Error fetching public activity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
