import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/hn-rate-limit";
import { hnFetchAuthTokens, hnPostComment } from "@/lib/hn-scraper";
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
  if (!(body?.parentId && body?.text?.trim())) {
    return NextResponse.json(
      { success: false, error: "parentId and text are required." },
      { status: 400 }
    );
  }

  const { allowed, retryAfterMs } = checkRateLimit(session, "write");
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `You're posting too fast. Try again in ${Math.ceil((retryAfterMs ?? 0) / 1000)}s.`,
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
    const tokens = await hnFetchAuthTokens(body.parentId, session);
    if (!tokens.fnid) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not fetch comment token. Session may have expired.",
        },
        { status: 422 }
      );
    }

    const result = await hnPostComment(
      body.parentId,
      body.text.trim(),
      tokens.fnid,
      session
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (err) {
    console.error("[hn/comment] failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not reach Hacker News." },
      { status: 502 }
    );
  }
}
