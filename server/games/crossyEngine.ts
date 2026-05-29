import crypto from "crypto";
import { crossySeed } from "@/lib/games/crossy";
import { getCrossyEconomy, getGlobalEconomy } from "@/server/economy/configLoader";
import { resolvePlayerWins } from "@/server/economy/houseEdge";
import { DEFAULT_CROSSY_LANE_PAYOUTS } from "@/server/economy/defaultConfigs";

export type LaneMeta = {
  obstacles: boolean[];
  carSpeedOffset: number;
  trainDelayMs: number;
  spacing: number;
  nearMiss: boolean;
};

export type CrossyServerState = {
  seed: string;
  seedHash: string;
  lanes: LaneMeta[];
  gridWidth: number;
};

const MIN_MS_PER_LANE = 400;
const MAX_MS_PER_LANE = 12_000;
const MIN_RUN_MS = 800;

function laneDensity(lane: number, scale: number): number {
  if (lane < 3) return 0.12 * scale;
  if (lane < 6) return (0.22 + (lane - 3) * 0.08) * scale;
  return Math.min(0.92, (0.45 + (lane - 6) * 0.12) * scale);
}

function hmacUnit(seed: string, tag: string): number {
  const buf = crypto.createHmac("sha256", seed).update(tag).digest();
  return buf.readUInt32BE(0) / 0xffff_ffff;
}

export async function createCrossyServerState(): Promise<CrossyServerState> {
  const cfg = await getCrossyEconomy();
  if (cfg.paused) throw new Error("GAME_PAUSED");

  const { seed, seedHash } = crossySeed();
  const gridWidth = 20;
  const scale = cfg.laneDifficultyScale ?? 1;
  const laneCount = cfg.lanePayouts?.length ?? DEFAULT_CROSSY_LANE_PAYOUTS.length;

  const lanes: LaneMeta[] = Array.from({ length: laneCount }, (_, lane) => {
    const density = laneDensity(lane, scale);
    const obstacles: boolean[] = [];
    for (let i = 0; i < gridWidth; i++) {
      obstacles.push(hmacUnit(seed, `obs-${lane}-${i}`) < density);
    }
    const nearMiss = hmacUnit(seed, `nm-${lane}`) < 0.18 && lane >= 3;
    return {
      obstacles,
      carSpeedOffset: 0.6 + hmacUnit(seed, `spd-${lane}`) * 1.4,
      trainDelayMs: Math.floor(800 + hmacUnit(seed, `tr-${lane}`) * 2200),
      spacing: 0.8 + hmacUnit(seed, `sp-${lane}`) * 0.6,
      nearMiss,
    };
  });

  return { seed, seedHash, lanes, gridWidth };
}

export type AdvanceInput = {
  lane: number;
  position: number;
  clientTimestamp: number;
  serverState: CrossyServerState;
  previousLane: number;
  lastAdvanceAt: number;
  runStartedAt: number;
};

export type AdvanceResult =
  | { ok: true; died: false; lane: number; payoutMultiplier: number; nearMiss: boolean }
  | { ok: true; died: true; reason: string }
  | { ok: false; reason: string; suspicionDelta: number };

/**
 * Server-authoritative lane advance — anti-teleport, anti-speedhack.
 */
export function validateLaneAdvance(input: AdvanceInput): AdvanceResult {
  const lane = Math.floor(input.lane);
  const pos = Math.floor(input.position);

  if (lane !== input.previousLane + 1) {
    return { ok: false, reason: "TELEPORT", suspicionDelta: 25 };
  }

  const now = input.clientTimestamp;
  const delta = now - input.lastAdvanceAt;
  if (delta < MIN_MS_PER_LANE) {
    return { ok: false, reason: "SPEEDHACK", suspicionDelta: 40 };
  }
  if (delta > MAX_MS_PER_LANE) {
    return { ok: false, reason: "STALE", suspicionDelta: 5 };
  }
  if (now - input.runStartedAt < MIN_RUN_MS && lane > 2) {
    return { ok: false, reason: "IMPOSSIBLE_PACE", suspicionDelta: 30 };
  }

  const meta = input.serverState.lanes[lane];
  if (!meta) return { ok: false, reason: "INVALID_LANE", suspicionDelta: 10 };

  if (pos < 0 || pos >= input.serverState.gridWidth) {
    return { ok: false, reason: "OUT_OF_BOUNDS", suspicionDelta: 15 };
  }

  if (meta.obstacles[pos]) {
    return { ok: true, died: true, reason: "HIT" };
  }

  const payouts = DEFAULT_CROSSY_LANE_PAYOUTS;
  const mult = payouts[Math.min(lane, payouts.length - 1)] ?? 1;

  return {
    ok: true,
    died: false,
    lane,
    payoutMultiplier: mult,
    nearMiss: meta.nearMiss,
  };
}

export type CompleteInput = {
  wager: number;
  highestLane: number;
  serverState: CrossyServerState;
  died: boolean;
};

export async function resolveCrossyComplete(input: CompleteInput): Promise<{
  outcome: "win" | "loss";
  payout: number;
  houseProfit: number;
  multiplier: number;
  playerWins: boolean;
}> {
  const cfg = await getCrossyEconomy();
  const payouts = cfg.lanePayouts ?? DEFAULT_CROSSY_LANE_PAYOUTS;
  const lane = Math.max(0, Math.min(input.highestLane, payouts.length - 1));
  const mult = payouts[lane] ?? 1;

  if (input.died && lane === 0) {
    return {
      outcome: "loss",
      payout: 0,
      houseProfit: input.wager,
      multiplier: 0,
      playerWins: false,
    };
  }

  const global = await getGlobalEconomy();
  const grossIfWin = Math.floor(input.wager * mult);
  const playerWins = resolvePlayerWins(
    input.wager,
    () => hmacUnit(input.serverState.seed, `complete-${lane}`),
    global,
    cfg.playerWinRateOverride,
  );

  if (!playerWins || input.died) {
    const partial = input.died && lane > 0 ? Math.floor(input.wager * (payouts[lane - 1] ?? 1) * 0.5) : 0;
    return {
      outcome: partial > 0 ? "win" : "loss",
      payout: partial,
      houseProfit: input.wager - partial,
      multiplier: partial > 0 ? (payouts[lane - 1] ?? 0) * 0.5 : 0,
      playerWins: partial > 0,
    };
  }

  return {
    outcome: "win",
    payout: Math.min(grossIfWin, cfg.maxPayout),
    houseProfit: input.wager - Math.min(grossIfWin, cfg.maxPayout),
    multiplier: mult,
    playerWins: true,
  };
}
