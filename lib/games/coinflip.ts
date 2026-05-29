import crypto from "crypto";
import { randomUintBelow } from "@/lib/rng";

export type CoinSide = "heads" | "tails";

/** Fair 50/50 outcome using crypto (not Math.random). */
export function resolveCoinFlip(): CoinSide {
  return randomUintBelow(2) === 0 ? "heads" : "tails";
}

export function flipSeed(): { seed: string; seedHash: string } {
  const seed = crypto.randomBytes(32).toString("hex");
  const seedHash = crypto.createHash("sha256").update(seed, "utf8").digest("hex");
  return { seed, seedHash };
}
