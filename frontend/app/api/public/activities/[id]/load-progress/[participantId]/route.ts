import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { id: activityId, participantId } = await params;

    // Forward to Laravel backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://prod.qsights.com";
    const response = await fetch(
      `${backendUrl}/public/activities/${activityId}/load-progress/${participantId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to load progress" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Load progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
