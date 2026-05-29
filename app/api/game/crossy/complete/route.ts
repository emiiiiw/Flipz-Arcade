import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  resolveCrossyComplete,
  type CrossyServerState,
} from "@/server/games/crossyEngine";
import { recordGameRound, publishRoundWin } from "@/server/services/gameRoundRecorder";
import type { EngineRoundResult } from "@/server/games/types";
import { issueNonce } from "@/server/security/nonce";
import { syncVipTier } from "@/server/services/vip";

/** Server settles run — client does not send win/loss boolean */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as { runId: string; cashOut?: boolean };

    const run = await prisma.crossyRun.findFirst({
      where: {
        id: body.runId,
        sessionId: session.sessionId,
        status: { in: ["active", "dead"] },
      },
    });
    if (!run || !run.serverState) {
      return NextResponse.json({ error: "no_run" }, { status: 400 });
    }

    const serverState = JSON.parse(run.serverState) as CrossyServerState;
    const died = run.status === "dead";
    const highestLane = run.currentLane;

    const resolved = await resolveCrossyComplete({
      wager: run.betAmount,
      highestLane,
      serverState,
      died: died && !body.cashOut,
    });

    const engineResult: EngineRoundResult = {
      outcome: resolved.outcome,
      payout: resolved.payout,
      houseProfit: resolved.houseProfit,
      multiplier: resolved.multiplier,
      seed: run.seed,
      seedHash: run.seedHash,
      clientPayload: {
        highestLane,
        multiplier: resolved.multiplier,
        outcome: resolved.outcome,
      },
    };

    await prisma.$transaction(async (tx) => {
      if (resolved.payout > 0) {
        await tx.session.update({
          where: { id: session.sessionId },
          data: {
            balance: { increment: resolved.payout },
            totalWon: { increment: resolved.payout },
          },
        });
      }
      await tx.crossyRun.update({
        where: { id: run.id },
        data: { status: resolved.outcome === "win" ? "won" : "lost" },
      });
      await recordGameRound(tx, {
        sessionId: session.sessionId,
        game: "crossy",
        wager: run.betAmount,
        result: engineResult,
        displayName: session.displayName,
      });
    });

    await publishRoundWin(session.displayName, "crossy", engineResult);
    await syncVipTier(session.sessionId);

    const updated = await prisma.session.findUniqueOrThrow({
      where: { id: session.sessionId },
    });

    return NextResponse.json({
      newBalance: updated.balance,
      outcome: resolved.outcome,
      payout: resolved.payout,
      multiplier: resolved.multiplier,
      nextNonce: await issueNonce(session.sessionId, "crossy"),
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
