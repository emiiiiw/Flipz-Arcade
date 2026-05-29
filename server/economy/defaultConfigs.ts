import type {
  CardsEconomyConfig,
  CrashEconomyConfig,
  CrossyEconomyConfig,
  GameEconomyConfig,
  GlobalEconomyConfig,
} from "./types";

export const DEFAULT_CRASH_DISTRIBUTION: CrashEconomyConfig["distribution"] = [
  { label: "sub_1.20", min: 1.0, max: 1.2, weight: 55 },
  { label: "1.21_1.50", min: 1.21, max: 1.5, weight: 25 },
  { label: "1.51_2.00", min: 1.51, max: 2.0, weight: 12 },
  { label: "2.01_5.00", min: 2.01, max: 5.0, weight: 6 },
  { label: "5.01_15.00", min: 5.01, max: 15.0, weight: 1.8 },
  { label: "above_15", min: 15.01, max: 1000, weight: 0.2 },
];

export const DEFAULT_CROSSY_LANE_PAYOUTS = [
  1.05, 1.12, 1.25, 1.45, 1.8, 2.4, 3.4, 5.0, 8.0, 15.0,
];

export function defaultGameConfig(partial?: Partial<GameEconomyConfig>): GameEconomyConfig {
  return {
    rtp: 0.3,
    volatilityTier: "high",
    maxPayout: 50_000_000,
    maxWinStreak: 8,
    jackpotChance: 0.001,
    jackpotContributionPct: 0.01,
    minBet: 20_000,
    maxBet: 500_000,
    paused: false,
    ...partial,
  };
}

export const ECONOMY_SEEDS: Record<string, unknown> = {
  global: {
    highWagerThreshold: 100_000,
    houseWinRateBelowThreshold: 0.78,
    houseWinRateAtOrAboveThreshold: 0.93,
  } satisfies GlobalEconomyConfig,
  coinflip: defaultGameConfig({ rtp: 0.22, maxBet: 500_000 }),
  crash: {
    ...defaultGameConfig({ rtp: 0.25, maxBet: 500_000 }),
    distribution: DEFAULT_CRASH_DISTRIBUTION,
  } satisfies CrashEconomyConfig,
  crossy: {
    ...defaultGameConfig({ rtp: 0.18, maxBet: 200_000 }),
    laneDifficultyScale: 1,
    lanePayouts: DEFAULT_CROSSY_LANE_PAYOUTS,
  } satisfies CrossyEconomyConfig,
  higher_lower: {
    ...defaultGameConfig({ rtp: 0.2 }),
    chainMultipliers: [1.45, 2.1025, 2.8, 2.8],
    cardRarityWeights: { common: 50, rare: 30, epic: 15, legendary: 4, mythic: 1 },
  } satisfies CardsEconomyConfig,
  packs: defaultGameConfig({ minBet: 5_000, maxBet: 1_000_000 }),
};
