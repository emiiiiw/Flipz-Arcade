import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { EngineRoundResult } from "@/server/games/types";
import { recordActivityWin } from "./activityFeed";

export async function recordGameRound(
  tx: Prisma.TransactionClient,
  params: {
    sessionId: string;
    game: string;
    wager: number;
    result: EngineRoundResult;
    nonce?: string;
    displayName?: string;
  },
): Promise<string> {
  const { sessionId, game, wager, result, nonce, displayName } = params;

  const round = await tx.gameRound.create({
    data: {
      sessionId,
      game,
      wager,
      outcome: result.outcome,
      payout: result.payout,
      houseProfit: result.houseProfit,
      multiplier: result.multiplier,
      seed: result.seed,
      seedHash: result.seedHash,
      nonce,
      metadata: result.metadata ? JSON.stringify(result.metadata) : null,
    },
  });

  await tx.gameResult.create({
    data: {
      roundId: round.id,
      payload: JSON.stringify(result.clientPayload),
    },
  });

  await tx.bet.create({
    data: {
      sessionId,
      game,
      amount: wager,
      outcome: result.outcome,
      payout: result.payout,
      houseProfit: result.houseProfit,
      multiplier: result.multiplier,
      seedHash: result.seedHash,
      seed: result.seed,
      metadata: JSON.stringify({ roundId: round.id }),
    },
  });

  await tx.walletTransaction.create({
    data: {
      sessionId,
      type: result.payout > 0 ? "win" : "bet",
      amount: result.payout > 0 ? result.payout : -wager,
      reference: round.id,
    },
  });

  return round.id;
}

/** Call after transaction commits */
export async function publishRoundWin(
  displayName: string,
  game: string,
  result: EngineRoundResult,
): Promise<void> {
  if (result.payout > 0) {
    await recordActivityWin({
      displayName,
      amount: result.payout,
      multiplier: result.multiplier,
      game,
      isSynthetic: false,
    });
  }
}
