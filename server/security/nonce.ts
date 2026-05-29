import crypto from "crypto";
import { prisma } from "@/lib/db";

const NONCE_TTL_MS = 5 * 60 * 1000;

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** Issue a single-use nonce for a session action */
export async function issueNonce(sessionId: string, action: string): Promise<string> {
  const nonce = generateNonce();
  await prisma.requestNonce.create({
    data: {
      sessionId,
      nonce,
      action,
      expiresAt: new Date(Date.now() + NONCE_TTL_MS),
    },
  });
  return nonce;
}

/**
 * Consume nonce — prevents replay. Returns false if missing, used, or expired.
 */
export async function consumeNonce(
  sessionId: string,
  nonce: string,
  action: string,
): Promise<boolean> {
  const row = await prisma.requestNonce.findUnique({ where: { nonce } });
  if (!row || row.sessionId !== sessionId || row.action !== action) return false;
  if (row.usedAt) return false;
  if (row.expiresAt < new Date()) return false;

  await prisma.requestNonce.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}
