import { prisma } from "@/lib/db";

/** Wager volume thresholds for tier upgrades (fictional currency) */
const TIER_THRESHOLDS: Record<string, number> = {
  bronze: 0,
  silver: 500_000,
  gold: 2_000_000,
  black: 10_000_000,
  founder: 50_000_000,
};

const TIER_ORDER = ["bronze", "silver", "gold", "black", "founder"] as const;

export function tierForWagered(totalWagered: number): string {
  let tier: string = "bronze";
  for (const t of TIER_ORDER) {
    if (totalWagered >= (TIER_THRESHOLDS[t] ?? 0)) tier = t;
  }
  return tier;
}

export async function syncVipTier(sessionId: string): Promise<string> {
  const s = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
  const tier = tierForWagered(s.totalWagered);
  await prisma.session.update({ where: { id: sessionId }, data: { vipTier: tier } });
  await prisma.vipStatus.upsert({
    where: { sessionId },
    create: { sessionId, tier, xp: s.totalWagered },
    update: { tier, xp: s.totalWagered },
  });
  return tier;
}

export function betCapForTier(tier: string, defaultMax: number): number {
  const mult: Record<string, number> = {
    bronze: 1,
    silver: 1.25,
    gold: 1.5,
    black: 2,
    founder: 3,
  };
  return Math.floor(defaultMax * (mult[tier] ?? 1));
}
