import { NextResponse } from "next/server";
import { hnFetchCurrentUser } from "@/lib/hn-scraper";
import { clearHnSession, getHnSession } from "@/lib/hn-session";

export async function GET() {
  const session = await getHnSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const user = await hnFetchCurrentUser(session);
    if (!user) {
      const response = NextResponse.json({ authenticated: false });
      clearHnSession(response);
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      username: user.username,
      karma: user.karma,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
