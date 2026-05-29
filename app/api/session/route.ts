import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/session";

export async function GET() {
  const s = await getSessionFromCookie();
  if (!s) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    sessionId: s.sessionId,
    displayName: s.displayName,
    balance: s.balance,
    totalDeposited: s.totalDeposited,
    totalWagered: s.totalWagered,
    totalWon: s.totalWon,
  });
}
