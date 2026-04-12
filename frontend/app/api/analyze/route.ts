import { NextRequest, NextResponse } from "next/server";
import { normalizeBackendResponse } from "@/lib/mock-analysis";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("video");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A video file is required." },
      { status: 400 }
    );
  }

  const backendUrl = process.env.AED_MAE_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      {
        error:
          "Live ML backend is not configured. Set AED_MAE_BACKEND_URL to enable real anomaly detection."
      },
      { status: 503 }
    );
  }

  try {
    const payload = new FormData();
    payload.append("video", file);

    const response = await fetch(backendUrl, {
      method: "POST",
      body: payload,
      cache: "no-store"
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 600);
      return NextResponse.json(
        {
          error: `Backend returned ${response.status}`,
          details
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(await normalizeBackendResponse(data));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Live backend request failed: ${error.message}`
            : "Live backend request failed."
      },
      { status: 502 }
    );
  }
}
