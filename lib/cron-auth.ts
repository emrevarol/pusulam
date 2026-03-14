import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify cron/internal request authorization.
 * Returns null if authorized, or a NextResponse error if not.
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;

  // In production, secrets MUST be configured
  if (!cronSecret && process.env.NODE_ENV === "production") {
    console.error("CRON_SECRET is not set in production!");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // In dev without secrets, allow (for local testing)
  if (!cronSecret && !internalSecret) return null;

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  const isAuthorized =
    (cronSecret && safeCompare(token, cronSecret)) ||
    (internalSecret && safeCompare(token, internalSecret));

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
