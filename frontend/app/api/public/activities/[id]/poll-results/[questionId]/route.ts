import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id: activityId, questionId } = await params;

    // Forward to Laravel backend - CRITICAL: Must include /api prefix
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://prod.qsights.com/api";
    const response = await fetch(
      `${backendUrl}/public/activities/${activityId}/poll-results/${questionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to fetch poll results" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Poll results fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
