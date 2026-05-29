import { apiError, apiSuccess, parseJsonBody } from "@/lib/apiJson";
import { prisma } from "@/lib/db";
import { logAuthEnvStatus } from "@/lib/env";
import { findPlayerByRouting } from "@/lib/playerStore";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    logAuthEnvStatus();

    const parsed = await parseJsonBody<{ routingNumber?: string; routing?: string }>(req);
    if (!parsed.ok) return parsed.response;

    const routingNumber = (parsed.body.routingNumber ?? parsed.body.routing ?? "").trim();
    if (!routingNumber) {
      return apiError("routingNumber is required", 400);
    }

    const user = await findPlayerByRouting(routingNumber);
    if (!user) {
      return apiError("Player not found", 404);
    }

    const session = await prisma.session.findUnique({
      where: { routing: routingNumber },
    });
    if (!session) {
      return apiError("Player not found", 404);
    }

    const res = apiSuccess({
      user,
      displayName: session.displayName,
      balance: session.balance,
      sessionId: session.id,
    });

    res.cookies.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 14,
    });

    return res;
  } catch (e) {
    console.error("[returning-player]", e);
    const msg = e instanceof Error ? e.message : "server_error";
    return apiError(msg, 500);
  }
}
