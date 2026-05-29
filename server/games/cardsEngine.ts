import {
  CHAIN_PAYOUTS,
  compareGuess,
  deckSeed,
  shuffleDeck,
  type Card,
} from "@/lib/games/higherLower";
import { getCardsEconomy, getGlobalEconomy } from "@/server/economy/configLoader";
import { resolvePlayerWins } from "@/server/economy/houseEdge";
import { randomUintBelow } from "@/lib/rng";
import type { EngineRoundResult } from "./types";

export type CardsDeckState = {
  deck: Card[];
  seed: string;
  seedHash: string;
  index: number;
};

export function startCardsRound(baseBet: number): CardsDeckState {
  const deck = shuffleDeck();
  const { seed, seedHash } = deckSeed();
  return { deck, seed, seedHash, index: 0 };
}

export function getChainMultipliers(): readonly number[] {
  return CHAIN_PAYOUTS;
}

export type GuessInput = {
  state: CardsDeckState;
  wager: number;
  guess: "higher" | "lower";
  currentRound: number;
};

export type GuessResolution = {
  cmp: "win" | "loss" | "push";
  nextCard: Card;
  newIndex: number;
  /** After economy gate */
  effectiveOutcome: "win" | "loss" | "push";
};

/**
 * Server resolves card comparison, then applies house edge on wins.
 */
export async function resolveCardGuess(input: GuessInput): Promise<GuessResolution> {
  const cfg = await getCardsEconomy();
  const current = input.state.deck[input.state.index];
  const next = input.state.deck[input.state.index + 1];
  if (!next) throw new Error("DECK_END");

  const cmp = compareGuess(current, next, input.guess);
  if (cmp === "push") {
    return {
      cmp,
      nextCard: next,
      newIndex: input.state.index + 1,
      effectiveOutcome: "push",
    };
  }

  if (cmp === "loss") {
    return {
      cmp,
      nextCard: next,
      newIndex: input.state.index + 1,
      effectiveOutcome: "loss",
    };
  }

  const global = await getGlobalEconomy();
  const playerWins = resolvePlayerWins(
    input.wager,
    () => randomUintBelow(1_000_000) / 1_000_000,
    global,
    cfg.playerWinRateOverride,
  );

  return {
    cmp,
    nextCard: next,
    newIndex: input.state.index + 1,
    effectiveOutcome: playerWins ? "win" : "loss",
  };
}

export function bankAmount(baseBet: number, round: number, multipliers: readonly number[]): number {
  if (round <= 0) return 0;
  const mult = multipliers[Math.min(round - 1, multipliers.length - 1)];
  return Math.floor(baseBet * mult);
}

export async function resolveCardsBank(
  wager: number,
  round: number,
): Promise<EngineRoundResult> {
  const cfg = await getCardsEconomy();
  const mults = cfg.chainMultipliers ?? [...CHAIN_PAYOUTS];
  const mult = mults[Math.min(Math.max(round, 1) - 1, mults.length - 1)] ?? 1;
  const payout = Math.min(Math.floor(wager * mult), cfg.maxPayout);
  const houseProfit = wager - payout;

  return {
    outcome: "banked",
    payout,
    houseProfit,
    multiplier: mult,
    seed: "",
    seedHash: "",
    clientPayload: { banked: payout, round, multiplier: mult },
  };
}
