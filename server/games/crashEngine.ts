import crypto from "crypto";
import { randomUintBelow } from "@/lib/rng";
import { sha256Hex } from "@/lib/rng";
import { getCrashEconomy, getGlobalEconomy } from "@/server/economy/configLoader";
import type { CrashDistributionBucket } from "@/server/economy/types";
import { multiplierAtTime } from "@/lib/games/crash";

export type CrashRoundPlan = {
  roundId: string;
  seed: string;
  seedHash: string;
  crashPoint: number;
};

/**
 * Weighted crash point from admin-configurable distribution buckets.
 */
export function sampleCrashPointFromDistribution(
  buckets: CrashDistributionBucket[],
  rng: () => number = () => randomUintBelow(1_000_000) / 1_000_000,
): number {
  const total = buckets.reduce((s, b) => s + b.weight, 0);
  let roll = rng() * total;
  for (const b of buckets) {
    roll -= b.weight;
    if (roll <= 0) {
      const span = b.max - b.min;
      const point = b.min + rng() * span;
      return Math.min(1000, Math.max(1.01, Math.floor(point * 100) / 100));
    }
  }
  return 1.01;
}

export async function planCrashRound(roundId?: string): Promise<CrashRoundPlan> {
  const cfg = await getCrashEconomy();
  if (cfg.paused) throw new Error("GAME_PAUSED");

  const id = roundId ?? crypto.randomUUID();
  const seed = crypto.randomBytes(32).toString("hex");
  const seedHash = sha256Hex(seed);
  const crashPoint = sampleCrashPointFromDistribution(cfg.distribution);

  return { roundId: id, seed, seedHash, crashPoint };
}

export type CrashCashoutInput = {
  wager: number;
  betPlacedAt: number;
  cashoutAt: number;
  crashPoint: number;
  requestedMultiplier?: number;
};

/**
 * Server validates cashout timing — client multiplier is ignored except for sanity check.
 */
export function validateCrashCashout(input: CrashCashoutInput): {
  ok: boolean;
  multiplier: number;
  payout: number;
  reason?: string;
} {
  const elapsed = Math.max(0, input.cashoutAt - input.betPlacedAt);
  const serverMult = Math.min(multiplierAtTime(elapsed), input.crashPoint);
  const mult = Math.floor(serverMult * 100) / 100;

  if (mult >= input.crashPoint - 1e-6) {
    return { ok: false, multiplier: mult, payout: 0, reason: "CRASHED" };
  }
  if (
    input.requestedMultiplier !== undefined &&
    Math.abs(input.requestedMultiplier - mult) > 0.15
  ) {
    return { ok: false, multiplier: mult, payout: 0, reason: "MULT_MISMATCH" };
  }

  const payout = Math.floor(input.wager * mult);
  return { ok: true, multiplier: mult, payout };
}

/** Apply house edge gate on crash bets that would have won */
export async function applyCrashHouseGate(
  wager: number,
  wouldWin: boolean,
): Promise<boolean> {
  if (!wouldWin) return false;
  const global = await getGlobalEconomy();
  const cfg = await getCrashEconomy();
  const p =
    cfg.playerWinRateOverride ??
    (wager < global.highWagerThreshold ? 0.3 : 0.1);
  return randomUintBelow(1_000_000) / 1_000_000 < p;
}

export { multiplierAtTime };
