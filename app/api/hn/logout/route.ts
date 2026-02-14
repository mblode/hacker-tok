import { NextResponse } from "next/server";
import { clearHnSession } from "@/lib/hn-session";

export function POST() {
  const response = NextResponse.json({ success: true });
  clearHnSession(response);
  return response;
}
