import crypto from "crypto";

/** Uniform integer in [0, max) using rejection sampling (crypto only). */
export function randomUintBelow(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error("randomUintBelow: max must be a positive integer");
  }
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  for (;;) {
    const buf = crypto.randomBytes(4);
    const x = buf.readUInt32BE(0);
    if (x < limit) return x % max;
  }
}

export function randomBytesHex(length: number): string {
  return crypto.randomBytes(length).toString("hex");
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
