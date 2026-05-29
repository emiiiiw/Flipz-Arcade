import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { openPack } from "@/server/services/packs";
import { checkRateLimit, rateLimitKey } from "@/server/security/rateLimit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const rl = checkRateLimit(rateLimitKey(session.sessionId, "pack"), 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await req.json()) as { packSlug?: string };
    const packSlug = body.packSlug ?? "arcade-standard";
    const result = await openPack(session.sessionId, packSlug, session.displayName);

    const updated = await import("@/lib/db").then((m) =>
      m.prisma.session.findUniqueOrThrow({ where: { id: session.sessionId } }),
    );

    return NextResponse.json({ ...result, newBalance: updated.balance });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if ((e as Error).message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "insufficient_balance" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
