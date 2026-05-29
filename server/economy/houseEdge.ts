import type { GlobalEconomyConfig } from "./types";
import { DEFAULT_GLOBAL } from "./types";

/**
 * Tiered house edge (server-only): below threshold ~78% house wins; at/above ~93%.
 * Returns PLAYER win probability (not house).
 */
export function getPlayerWinProbability(
  wager: number,
  global: GlobalEconomyConfig = DEFAULT_GLOBAL,
  override?: number,
): number {
  if (override !== undefined && Number.isFinite(override)) {
    return Math.min(1, Math.max(0, override));
  }
  const houseWin =
    wager < global.highWagerThreshold
      ? global.houseWinRateBelowThreshold
      : global.houseWinRateAtOrAboveThreshold;
  return 1 - houseWin;
}

/** Resolve binary outcome: true = player wins, false = house wins */
export function resolvePlayerWins(
  wager: number,
  rng: () => number,
  global?: GlobalEconomyConfig,
  override?: number,
): boolean {
  const p = getPlayerWinProbability(wager, global, override);
  return rng() < p;
}
