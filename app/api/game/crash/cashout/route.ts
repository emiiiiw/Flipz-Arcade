import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getCrashEngine } from "@/lib/crash-engine";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as { betId: string };
    if (!body.betId) {
      return NextResponse.json({ error: "betId required" }, { status: 400 });
    }
    const engine = getCrashEngine();
    const result = await engine.cashBet(session.sessionId, body.betId);
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (msg === "no_bet" || msg === "already_closed" || msg === "not_flying") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
