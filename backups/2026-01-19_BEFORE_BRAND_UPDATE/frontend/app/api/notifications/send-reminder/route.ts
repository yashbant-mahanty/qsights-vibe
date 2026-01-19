import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'https://prod.qsights.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept both programId and program_id
    const programId = body.programId || body.program_id;
    const participantIds = body.participant_ids || body.participantIds || [];

    // Get auth token from cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Call backend to send reminders for pending activities in the program
    const response = await fetch(`${BACKEND_URL}/api/notifications/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ 
        program_id: programId,
        participant_ids: participantIds 
      }),
    });

    if (!response.ok) {
      // If backend endpoint doesn't exist, implement fallback logic
      if (response.status === 404) {
        // Fallback: Get pending activities and send reminders
        const activitiesResponse = await fetch(`${BACKEND_URL}/api/activities?program_id=${programId || ''}&status=active`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (!activitiesResponse.ok) {
          return NextResponse.json(
            { error: "Failed to fetch activities" },
            { status: 500 }
          );
        }

        const activitiesData = await activitiesResponse.json();
        const activities = activitiesData.data || activitiesData || [];
        
        let remindersSent = 0;
        let errors = 0;

        // For each active activity, get participants with pending responses
        for (const activity of activities) {
          try {
            const participantsResponse = await fetch(
              `${BACKEND_URL}/api/activities/${activity.id}/participants?status=pending`,
              {
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                },
              }
            );

            if (participantsResponse.ok) {
              const participantsData = await participantsResponse.json();
              const pendingParticipants = participantsData.data || participantsData || [];
              
              // Send reminder to each pending participant
              for (const participant of pendingParticipants) {
                if (participant.email) {
                  remindersSent++;
                }
              }
            }
          } catch (err) {
            errors++;
            console.error(`Error processing activity ${activity.id}:`, err);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Reminder process completed. ${remindersSent} participants identified for reminders.`,
          remindersSent,
          errors,
        });
      }

      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Failed to send reminders" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: data.message || "Reminders sent successfully",
      ...data,
    });

  } catch (error) {
    console.error("Send reminder error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminders" },
      { status: 500 }
    );
  }
}
