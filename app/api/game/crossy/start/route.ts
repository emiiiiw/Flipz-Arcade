import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createCrossyServerState } from "@/server/games/crossyEngine";
import { getCrossyEconomy } from "@/server/economy/configLoader";
import { tryDebitBetWagered } from "@/lib/session-debit";
import { issueNonce } from "@/server/security/nonce";
import { checkRateLimit, rateLimitKey } from "@/server/security/rateLimit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const rl = checkRateLimit(rateLimitKey(session.sessionId, "crossy"), 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await req.json()) as { betAmount: number };
    const betAmount = Math.floor(Number(body.betAmount));
    const cfg = await getCrossyEconomy();
    if (betAmount < cfg.minBet || betAmount > cfg.maxBet) {
      return NextResponse.json({ error: "invalid_bet" }, { status: 400 });
    }

    const serverState = await createCrossyServerState();

    try {
      await prisma.$transaction(
        async (tx) => {
          const activeRun = await tx.crossyRun.findFirst({
            where: { sessionId: session.sessionId, status: "active" },
          });
          if (activeRun) throw new Error("ACTIVE_RUN");

          const ok = await tryDebitBetWagered(tx, session.sessionId, betAmount);
          if (!ok) throw new Error("INSUFFICIENT_BALANCE");

          await tx.crossyRun.create({
            data: {
              sessionId: session.sessionId,
              seed: serverState.seed,
              seedHash: serverState.seedHash,
              betAmount,
              status: "active",
              currentLane: 0,
              serverState: JSON.stringify(serverState),
              laneTimestamps: JSON.stringify([]),
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (e) {
      if ((e as Error).message === "ACTIVE_RUN") {
        return NextResponse.json({ error: "active_run" }, { status: 400 });
      }
      if ((e as Error).message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "insufficient_balance" }, { status: 400 });
      }
      if ((e as Error).message === "GAME_PAUSED") {
        return NextResponse.json({ error: "game_paused" }, { status: 503 });
      }
      throw e;
    }

    const run = await prisma.crossyRun.findFirst({
      where: { sessionId: session.sessionId, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    const updated = await prisma.session.findUniqueOrThrow({
      where: { id: session.sessionId },
    });

    const lanes = serverState.lanes.map((l) => l.obstacles);

    return NextResponse.json({
      runId: run?.id,
      seedHash: serverState.seedHash,
      startedAt: run?.createdAt.getTime(),
      lanes,
      laneMeta: serverState.lanes.map((l) => ({
        nearMiss: l.nearMiss,
        carSpeedOffset: l.carSpeedOffset,
      })),
      newBalance: updated.balance,
      nextNonce: await issueNonce(session.sessionId, "crossy_advance"),
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
