import crypto from "crypto";
import { flipSeed, resolveCoinFlip, type CoinSide } from "@/lib/games/coinflip";
import { getGameEconomy, getGlobalEconomy } from "@/server/economy/configLoader";
import { getPlayerWinProbability } from "@/server/economy/houseEdge";
import { randomUintBelow } from "@/lib/rng";
import type { EngineRoundResult } from "./types";

export type CoinflipInput = {
  wager: number;
  pick: CoinSide;
};

/**
 * Server-authoritative coin flip.
 * Fair 50/50 result is then gated by economy house edge (player win probability).
 */
export async function runCoinflipRound(input: CoinflipInput): Promise<EngineRoundResult> {
  const cfg = await getGameEconomy("coinflip");
  if (cfg.paused) throw new Error("GAME_PAUSED");

  const wager = Math.floor(input.wager);
  if (wager < cfg.minBet || wager > cfg.maxBet) throw new Error("INVALID_WAGER");

  const global = await getGlobalEconomy();
  const { seed, seedHash } = flipSeed();
  const fairResult = resolveCoinFlip();
  const pickMatches = fairResult === input.pick;

  const playerWinProb = getPlayerWinProbability(
    wager,
    global,
    cfg.playerWinRateOverride,
  );
  const playerWins =
    pickMatches && randomUintBelow(1_000_000) / 1_000_000 < playerWinProb;

  const multiplier = playerWins ? 1.4 : 0;
  const payout = playerWins ? Math.floor(wager * 1.4) : 0;
  const houseProfit = wager - payout;

  return {
    outcome: playerWins ? "win" : "loss",
    payout,
    houseProfit,
    multiplier: playerWins ? 1.4 : 0,
    seed,
    seedHash,
    clientPayload: {
      result: fairResult,
      displayOutcome: playerWins ? "win" : "loss",
      pick: input.pick,
      playerWinProbability: playerWinProb,
    },
    metadata: { fairResult, pickMatches },
  };
}

export function coinflipPreviewHash(seed: string): string {
  return crypto.createHash("sha256").update(seed, "utf8").digest("hex");
}
