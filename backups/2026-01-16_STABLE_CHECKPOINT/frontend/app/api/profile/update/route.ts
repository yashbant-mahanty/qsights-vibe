import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get Laravel Sanctum token from cookie
    const backendToken = request.cookies.get("backendToken")?.value;

    if (!backendToken) {
      return NextResponse.json(
        { message: "Not authenticated - please login again" },
        { status: 401 }
      );
    }
    
    // Forward to Laravel backend
    const response = await fetch(`${API_URL}/profile/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${backendToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: String(error) },
      { status: 500 }
    );
  }
}
