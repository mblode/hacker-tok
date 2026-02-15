import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/hn-rate-limit";
import { hnFetchSubmitToken, hnSubmitStory } from "@/lib/hn-scraper";
import { getHnSession } from "@/lib/hn-session";

export async function POST(request: Request) {
  const session = await getHnSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.title?.trim()) {
    return NextResponse.json(
      { success: false, error: "Title is required." },
      { status: 400 }
    );
  }

  if (!(body.url?.trim() || body.text?.trim())) {
    return NextResponse.json(
      { success: false, error: "Either URL or text is required." },
      { status: 400 }
    );
  }

  const { allowed, retryAfterMs } = checkRateLimit(session, "write");
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `You're submitting too fast. Try again in ${Math.ceil((retryAfterMs ?? 0) / 1000)}s.`,
      },
      { status: 429 }
    );
  }

  const readLimit = checkRateLimit(session, "read");
  if (!readLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limited." },
      { status: 429 }
    );
  }

  try {
    const fnid = await hnFetchSubmitToken(session);
    if (!fnid) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not fetch submit token. Session may have expired.",
        },
        { status: 422 }
      );
    }

    const urlOrText = body.url?.trim()
      ? { url: body.url.trim() }
      : { text: body.text.trim() };

    const result = await hnSubmitStory(
      body.title.trim(),
      urlOrText,
      fnid,
      session
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (err) {
    console.error("[hn/submit] failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not reach Hacker News." },
      { status: 502 }
    );
  }
}
