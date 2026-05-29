import type { Prisma } from "@prisma/client";

/**
 * Atomically deduct a bet from balance only if balance >= amount.
 * Prevents concurrent requests from over-drawing using a stale balance read.
 */
export async function tryDebitBetWagered(
  tx: Prisma.TransactionClient,
  sessionId: string,
  betAmount: number,
): Promise<boolean> {
  const result = await tx.session.updateMany({
    where: { id: sessionId, balance: { gte: betAmount } },
    data: {
      balance: { increment: -betAmount },
      totalWagered: { increment: betAmount },
    },
  });
  return result.count === 1;
}

/** Coin flip: single atomic balance change including payout and stats. */
export async function tryDebitCoinFlipRound(
  tx: Prisma.TransactionClient,
  sessionId: string,
  betAmount: number,
  payout: number,
  win: boolean,
): Promise<boolean> {
  const result = await tx.session.updateMany({
    where: { id: sessionId, balance: { gte: betAmount } },
    data: {
      balance: { increment: -betAmount + payout },
      totalWagered: { increment: betAmount },
      totalWon: { increment: win ? payout : 0 },
    },
  });
  return result.count === 1;
}
