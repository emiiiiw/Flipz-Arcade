import crypto from "crypto";

/**
 * Provably fair crash point from seed + round id.
 * Uses mass `house` at instant 1.00x; remainder drives the multiplicative tail.
 * Formula: crash = max(1, (1 - house) / (1 - u)) with u uniform on [0,1).
 */
export function generateCrashPoint(seed: string, roundId: string): number {
  const hmac = crypto.createHmac("sha256", seed);
  hmac.update(roundId);
  const digest = hmac.digest();
  const n = digest.readUInt32BE(0) / 0x1_0000_0000;
  const u = Math.max(n, 1e-9);
  const house = 0.35;
  if (u < house) return 1.0;
  const adjustedU = (u - house) / (1 - house);
  const raw = (1 - house) / (1 - adjustedU);
  const crashPoint = Math.min(1000, Math.max(1.01, Math.floor(raw * 100) / 100));
  return crashPoint;
}

/** Multiplier curve: smooth exponential in time (ms). */
export function multiplierAtTime(tMs: number): number {
  return Math.min(1000, Math.pow(Math.E, tMs / 8000));
}

export function verifyCrashPoint(seed: string, roundId: string): number {
  return generateCrashPoint(seed, roundId);
}
