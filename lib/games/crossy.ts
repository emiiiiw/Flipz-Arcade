import crypto from "crypto";

/** Lane obstacle probability (0–1). Tuned for skill-friendly runs. */
const LANE_DENSITY = [0.12, 0.12, 0.12, 0.22, 0.22, 0.22, 0.35, 0.35, 0.35, 0.45, 0.45, 0.45];

export function generateLaneObstacles(
  seed: string,
  lane: number,
  gridWidth: number = 20,
): boolean[] {
  const laneDensity = LANE_DENSITY[Math.min(Math.max(lane, 0), LANE_DENSITY.length - 1)];
  const cells: boolean[] = [];
  for (let i = 0; i < gridWidth; i++) {
    const buf = crypto.createHmac("sha256", seed).update(`${lane}-${i}`).digest();
    const val = buf.readUInt32BE(0) / 0xffff_ffff;
    cells.push(val < laneDensity);
  }
  return cells;
}

export function crossySeed(): { seed: string; seedHash: string } {
  const seed = crypto.randomBytes(32).toString("hex");
  const seedHash = crypto.createHash("sha256").update(seed, "utf8").digest("hex");
  return { seed, seedHash };
}
