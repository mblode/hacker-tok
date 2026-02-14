import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/hn-rate-limit";
import { hnLogin } from "@/lib/hn-scraper";
import { setHnSession } from "@/lib/hn-session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!(body?.username && body?.password)) {
    return NextResponse.json(
      { success: false, error: "Username and password are required." },
      { status: 400 }
    );
  }

  const { allowed, retryAfterMs } = checkRateLimit("login", "write");
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many login attempts. Try again in ${Math.ceil((retryAfterMs ?? 0) / 1000)}s.`,
      },
      { status: 429 }
    );
  }

  try {
    const result = await hnLogin(body.username, body.password);
    if (!(result.success && result.cookie)) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      username: body.username,
    });

    setHnSession(response, result.cookie);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not reach Hacker News." },
      { status: 502 }
    );
  }
}
