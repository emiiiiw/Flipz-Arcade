import crypto from "crypto";
import { HIGHER_LOWER_CHAIN_PAYOUTS } from "@/lib/constants";
import { randomUintBelow } from "@/lib/rng";

export type Card = { suit: string; value: number };

export { HIGHER_LOWER_CHAIN_PAYOUTS as CHAIN_PAYOUTS };

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

/** Fisher–Yates shuffle using crypto-derived indices. */
export function shuffleDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const v of VALUES) deck.push({ suit: s, value: v });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomUintBelow(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function deckSeed(): { seed: string; seedHash: string } {
  const seed = crypto.randomBytes(32).toString("hex");
  const seedHash = crypto.createHash("sha256").update(seed, "utf8").digest("hex");
  return { seed, seedHash };
}

/** Ace low, King high. Equal rank = push (no bet movement) — player-friendly. */
export function compareGuess(
  current: Card,
  next: Card,
  guess: "higher" | "lower",
): "win" | "loss" | "push" {
  if (next.value === current.value) return "push";
  const isHigher = next.value > current.value;
  if (guess === "higher") return isHigher ? "win" : "loss";
  return !isHigher ? "win" : "loss";
}
