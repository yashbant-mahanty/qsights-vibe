import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const body = await request.json();
    const { participant_id, answers, started_at, time_expired_at, auto_submitted, token, is_preview, generated_link_tag } = body;

    // Validate required fields
    if (!participant_id) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Answers are required" },
        { status: 400 }
      );
    }

    console.log('Submitting to backend:', {
      activityId,
      participant_id,
      answersCount: Object.keys(answers).length,
      started_at,
      time_expired_at,
      auto_submitted,
      hasToken: !!token,
      is_preview,
      generated_link_tag,
      sampleAnswer: answers[Object.keys(answers)[0]]
    });

    // Submit response to backend with all fields including token for generated link status update
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/activities/${activityId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        participant_id,
        answers: answers,  // Send as object with question IDs as keys
        started_at,
        time_expired_at,
        auto_submitted,
        token,  // Generated link token for status update
        is_preview,
        generated_link_tag,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to submit response" }));
      console.error('Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('Backend response:', data);

    // Return the FULL backend response data structure
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error submitting response:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
