import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionnaireId } = await params;

    // Fetch public questionnaire data from backend
    // Use full backend URL for server-side fetch (BACKEND_URL) or fallback to public URL
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000/api';
    const response = await fetch(`${backendUrl}/public/questionnaires/${questionnaireId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Questionnaire not found" },
          { status: 404 }
        );
      }
      throw new Error("Failed to fetch questionnaire");
    }

    const data = await response.json();

    return NextResponse.json({
      message: "Questionnaire fetched successfully",
      data: data.data || data,
    });
  } catch (error) {
    console.error("Error fetching public questionnaire:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
