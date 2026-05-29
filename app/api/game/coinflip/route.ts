import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { CoinSide } from "@/lib/games/coinflip";
import { runCoinflipRound } from "@/server/games/coinflipEngine";
import { tryDebitCoinFlipRound } from "@/lib/session-debit";
import { consumeNonce, issueNonce } from "@/server/security/nonce";
import { checkRateLimit, rateLimitKey } from "@/server/security/rateLimit";
import { publishRoundWin, recordGameRound } from "@/server/services/gameRoundRecorder";
import { syncVipTier } from "@/server/services/vip";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const rl = checkRateLimit(rateLimitKey(session.sessionId, "coinflip"), 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await req.json()) as {
      betAmount: number;
      pick: CoinSide;
      nonce?: string;
    };

    if (body.nonce) {
      const ok = await consumeNonce(session.sessionId, body.nonce, "coinflip");
      if (!ok) return NextResponse.json({ error: "invalid_nonce" }, { status: 400 });
    }

    const result = await runCoinflipRound({
      wager: body.betAmount,
      pick: body.pick,
    });

    try {
      await prisma.$transaction(async (tx) => {
        const debited = await tryDebitCoinFlipRound(
          tx,
          session.sessionId,
          Math.floor(body.betAmount),
          result.payout,
          result.outcome === "win",
        );
        if (!debited) throw new Error("INSUFFICIENT_BALANCE");

        await recordGameRound(tx, {
          sessionId: session.sessionId,
          game: "coinflip",
          wager: Math.floor(body.betAmount),
          result,
          nonce: body.nonce,
        });
      });
    } catch (e) {
      if ((e as Error).message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "insufficient_balance" }, { status: 400 });
      }
      if ((e as Error).message === "GAME_PAUSED") {
        return NextResponse.json({ error: "game_paused" }, { status: 503 });
      }
      throw e;
    }

    await publishRoundWin(session.displayName, "coinflip", result);
    await syncVipTier(session.sessionId);

    const updated = await prisma.session.findUniqueOrThrow({
      where: { id: session.sessionId },
    });

    const nextNonce = await issueNonce(session.sessionId, "coinflip");

    return NextResponse.json({
      ...result.clientPayload,
      outcome: result.outcome,
      payout: result.payout,
      newBalance: updated.balance,
      seedHash: result.seedHash,
      nextNonce,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if ((e as Error).message === "INVALID_WAGER") {
      return NextResponse.json({ error: "invalid_bet" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
