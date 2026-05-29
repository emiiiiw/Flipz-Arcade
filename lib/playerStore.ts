import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export type PlayerUser = {
  id: string;
  routingNumber: string;
  displayName: string;
  balance: number;
  isVerified: boolean;
  vipTier: string;
};

function mapSession(row: {
  id: string;
  routing: string;
  displayName: string;
  balance: number;
  isVerified: boolean;
  vipTier: string;
}): PlayerUser {
  return {
    id: row.id,
    routingNumber: row.routing,
    displayName: row.displayName,
    balance: row.balance,
    isVerified: row.isVerified,
    vipTier: row.vipTier,
  };
}

/**
 * Optional Supabase `players` table (routing_number text primary lookup).
 * Falls back to Prisma Session when Supabase is unset or unavailable.
 */
async function findInSupabase(routingNumber: string): Promise<PlayerUser | null> {
  const url = env.supabaseUrl();
  const key = env.supabaseServiceRoleKey();
  if (!url || !key) return null;

  try {
    const q = new URL(`${url.replace(/\/$/, "")}/rest/v1/players`);
    q.searchParams.set("routing_number", `eq.${routingNumber}`);
    q.searchParams.set("select", "*");
    q.searchParams.set("limit", "1");

    const res = await fetch(q.toString(), {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok || !text) return null;

    const rows = JSON.parse(text) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (!row) return null;

    return {
      id: String(row.id ?? row.user_id ?? routingNumber),
      routingNumber: String(row.routing_number ?? routingNumber),
      displayName: String(row.display_name ?? row.displayName ?? "Player"),
      balance: Number(row.balance ?? 0),
      isVerified: Boolean(row.is_verified ?? row.isVerified ?? false),
      vipTier: String(row.vip_tier ?? row.vipTier ?? "bronze"),
    };
  } catch (e) {
    console.warn("[playerStore] Supabase lookup failed:", e);
    return null;
  }
}

export async function findPlayerByRouting(
  routingNumber: string,
): Promise<PlayerUser | null> {
  const fromSupabase = await findInSupabase(routingNumber);
  if (fromSupabase) return fromSupabase;

  const session = await prisma.session.findUnique({
    where: { routing: routingNumber },
  });
  if (!session) return null;
  return mapSession(session);
}

export async function ensureLocalPlayerByRouting(
  routingNumber: string,
  displayName = "Player",
): Promise<PlayerUser> {
  const existing = await prisma.session.findUnique({
    where: { routing: routingNumber },
  });
  if (existing) return mapSession(existing);

  const created = await prisma.session.create({
    data: {
      routing: routingNumber,
      displayName,
      balance: 0,
      isVerified: false,
    },
  });
  return mapSession(created);
}
