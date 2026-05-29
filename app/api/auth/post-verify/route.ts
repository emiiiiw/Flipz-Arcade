import { apiError, apiSuccess } from "@/lib/apiJson";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * After Fleeca redirects the player back, call this with `routing` so the
 * browser receives the httpOnly session cookie (webhooks are server-to-server).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const routing = url.searchParams.get("routing")?.trim();
    if (!routing) {
      return apiError("routing required", 400);
    }

    const session = await prisma.session.findUnique({ where: { routing } });
    if (!session) {
      return apiError("not_found", 404);
    }

    const pending = await prisma.payment.findFirst({
      where: {
        routing,
        type: "verification",
        status: "pending",
      },
    });
    if (pending) {
      return apiError("verification_pending", 400);
    }

    const res = apiSuccess({
      ok: true,
      displayName: session.displayName,
      balance: session.balance,
      user: {
        id: session.id,
        routingNumber: session.routing,
        displayName: session.displayName,
        balance: session.balance,
        isVerified: session.isVerified,
        vipTier: session.vipTier,
      },
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
    console.error("[post-verify]", e);
    const msg = e instanceof Error ? e.message : "server_error";
    return apiError(msg, 500);
  }
}
