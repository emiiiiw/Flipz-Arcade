import { apiError, apiSuccess, parseJsonBody } from "@/lib/apiJson";
import { prisma } from "@/lib/db";
import { logAuthEnvStatus } from "@/lib/env";
import { findPlayerByRouting } from "@/lib/playerStore";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/** @deprecated Prefer POST /api/auth/returning-player — kept for compatibility */
export async function POST(req: Request) {
  try {
    logAuthEnvStatus();

    const parsed = await parseJsonBody<{ routing?: string; routingNumber?: string }>(req);
    if (!parsed.ok) return parsed.response;

    const routing = (parsed.body.routing ?? parsed.body.routingNumber ?? "").trim();
    if (!routing) {
      return apiError("routing required", 400);
    }

    const user = await findPlayerByRouting(routing);
    if (!user) {
      return apiError("not_found", 404);
    }

    const session = await prisma.session.findUnique({ where: { routing } });
    if (!session) {
      return apiError("not_found", 404);
    }

    const res = apiSuccess({
      ok: true,
      user,
      sessionId: session.id,
      displayName: session.displayName,
      balance: session.balance,
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
    console.error("[auth/login]", e);
    const msg = e instanceof Error ? e.message : "server_error";
    return apiError(msg, 500);
  }
}
