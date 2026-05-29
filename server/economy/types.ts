/** Per-game economy profile — persisted in economy_settings.config JSON */
export type GameEconomyConfig = {
  rtp: number;
  volatilityTier: "low" | "medium" | "high" | "extreme";
  maxPayout: number;
  maxWinStreak: number;
  jackpotChance: number;
  jackpotContributionPct: number;
  minBet: number;
  maxBet: number;
  paused: boolean;
  /** Optional override: player win rate 0–1 (if set, replaces tiered house edge) */
  playerWinRateOverride?: number;
};

export type CrossyEconomyConfig = GameEconomyConfig & {
  laneDifficultyScale: number;
  lanePayouts: number[];
};

export type CrashEconomyConfig = GameEconomyConfig & {
  distribution: CrashDistributionBucket[];
};

export type CrashDistributionBucket = {
  label: string;
  min: number;
  max: number;
  weight: number;
};

export type CardsEconomyConfig = GameEconomyConfig & {
  chainMultipliers: number[];
  cardRarityWeights: Record<string, number>;
};

export type GlobalEconomyConfig = {
  highWagerThreshold: number;
  houseWinRateBelowThreshold: number;
  houseWinRateAtOrAboveThreshold: number;
};

export const DEFAULT_GLOBAL: GlobalEconomyConfig = {
  highWagerThreshold: 100_000,
  houseWinRateBelowThreshold: 0.7,
  houseWinRateAtOrAboveThreshold: 0.9,
};
