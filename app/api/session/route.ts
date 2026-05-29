import { apiError, apiSuccess } from "@/lib/apiJson";
import { getSessionFromCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSessionFromCookie();
    if (!s) {
      return apiSuccess({ authenticated: false });
    }
    return apiSuccess({
      authenticated: true,
      sessionId: s.sessionId,
      displayName: s.displayName,
      balance: s.balance,
      totalDeposited: s.totalDeposited,
      totalWagered: s.totalWagered,
      totalWon: s.totalWon,
    });
  } catch (e) {
    console.error("[session]", e);
    const msg = e instanceof Error ? e.message : "server_error";
    return apiError(msg, 500);
  }
}
