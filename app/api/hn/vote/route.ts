import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/hn-rate-limit";
import { hnFetchAuthTokens, hnVote } from "@/lib/hn-scraper";
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
  if (!(body?.itemId && body?.direction)) {
    return NextResponse.json(
      { success: false, error: "itemId and direction are required." },
      { status: 400 }
    );
  }

  const { allowed, retryAfterMs } = checkRateLimit(session, "write");
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Rate limited. Try again in ${Math.ceil((retryAfterMs ?? 0) / 1000)}s.`,
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
    const tokens = await hnFetchAuthTokens(body.itemId, session);
    if (!tokens.upvoteAuth) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not fetch vote token. You may have already voted.",
        },
        { status: 422 }
      );
    }

    const result = await hnVote(
      body.itemId,
      body.direction,
      tokens.upvoteAuth,
      session
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[hn/vote] failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not reach Hacker News." },
      { status: 502 }
    );
  }
}
