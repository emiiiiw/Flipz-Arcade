import { env } from "@/lib/env";

const FLEECA_API_BASE = "https://banking.gta.world/api";

export type RoutingLookupResult = {
  valid: boolean;
  source: "fleeca" | "local";
  routingNumber: string;
  accountName?: string;
  message?: string;
};

function isValidRoutingFormat(routingNumber: string): boolean {
  return /^\d{6,12}$/.test(routingNumber);
}

/**
 * Server-only Fleeca routing validation.
 * Tries known API paths when FLEECA_API_KEY is set; otherwise format + local DB only.
 */
export async function lookupFleecaRouting(
  routingNumber: string,
): Promise<RoutingLookupResult> {
  const routing = routingNumber.trim();

  if (!routing) {
    return {
      valid: false,
      source: "local",
      routingNumber: routing,
      message: "Routing number is required",
    };
  }

  if (!isValidRoutingFormat(routing)) {
    return {
      valid: false,
      source: "local",
      routingNumber: routing,
      message: "Routing number must be 6–12 digits",
    };
  }

  const apiKey = env.fleecaApiKey();
  if (!apiKey) {
    return {
      valid: true,
      source: "local",
      routingNumber: routing,
      message: "FLEECA_API_KEY not set — using local routing validation only",
    };
  }

  const paths = [
    `/v2/routing/${encodeURIComponent(routing)}`,
    `/v2/accounts/${encodeURIComponent(routing)}`,
    `/v2/account?routing=${encodeURIComponent(routing)}`,
  ];

  for (const path of paths) {
    try {
      const res = await fetch(`${FLEECA_API_BASE}${path}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const text = await res.text();
      if (res.status === 404) continue;

      if (res.ok && text) {
        let data: Record<string, unknown> = {};
        try {
          data = JSON.parse(text) as Record<string, unknown>;
        } catch {
          /* non-json ok */
        }
        const name =
          typeof data.name === "string"
            ? data.name
            : typeof data.account_name === "string"
              ? data.account_name
              : typeof data.holder_name === "string"
                ? data.holder_name
                : undefined;

        return {
          valid: true,
          source: "fleeca",
          routingNumber: routing,
          accountName: name,
        };
      }
    } catch (e) {
      console.warn("[fleecaLookup] endpoint failed:", path, e);
    }
  }

  return {
    valid: true,
    source: "local",
    routingNumber: routing,
    message: "Fleeca lookup endpoint unavailable — validated format locally",
  };
}
