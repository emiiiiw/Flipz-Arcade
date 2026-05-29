import { apiError, apiSuccess, parseJsonBody } from "@/lib/apiJson";
import { lookupFleecaRouting } from "@/lib/fleecaLookup";
import { logAuthEnvStatus } from "@/lib/env";
import { ensureLocalPlayerByRouting, findPlayerByRouting } from "@/lib/playerStore";

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

    const lookup = await lookupFleecaRouting(routingNumber);
    if (!lookup.valid) {
      return apiError(lookup.message ?? "Invalid routing number", 400, { lookup });
    }

    let user = await findPlayerByRouting(routingNumber);
    if (!user) {
      user = await ensureLocalPlayerByRouting(
        routingNumber,
        lookup.accountName ?? "Player",
      );
    }

    return apiSuccess({
      lookup,
      user,
      message: lookup.message,
    });
  } catch (e) {
    console.error("[lookup-routing]", e);
    const msg = e instanceof Error ? e.message : "lookup_failed";
    return apiError(msg, 500);
  }
}
