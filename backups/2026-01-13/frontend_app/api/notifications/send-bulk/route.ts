import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activityId, activityName, notificationType, language, participantIds, link } = body;

    if (!activityId || !participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { error: "Activity ID and participant IDs are required" },
        { status: 400 }
      );
    }

    // Forward to Laravel backend
    const response = await fetch(`${API_URL}/notifications/send-bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        activity_id: activityId,
        activity_name: activityName,
        notification_type: notificationType,
        language,
        participant_ids: participantIds,
        link,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to send bulk emails" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Bulk email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
