import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  validateLaneAdvance,
  type CrossyServerState,
} from "@/server/games/crossyEngine";
import { consumeNonce, issueNonce } from "@/server/security/nonce";
import { bumpSuspicion } from "@/server/security/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as {
      runId: string;
      lane: number;
      position: number;
      clientTimestamp: number;
      nonce: string;
    };

    const ok = await consumeNonce(session.sessionId, body.nonce, "crossy_advance");
    if (!ok) return NextResponse.json({ error: "invalid_nonce" }, { status: 400 });

    const run = await prisma.crossyRun.findFirst({
      where: {
        id: body.runId,
        sessionId: session.sessionId,
        status: "active",
      },
    });
    if (!run || !run.serverState) {
      return NextResponse.json({ error: "no_run" }, { status: 400 });
    }

    const serverState = JSON.parse(run.serverState) as CrossyServerState;
    const stamps = JSON.parse(run.laneTimestamps ?? "[]") as number[];

    const result = validateLaneAdvance({
      lane: body.lane,
      position: body.position,
      clientTimestamp: body.clientTimestamp,
      serverState,
      previousLane: run.currentLane,
      lastAdvanceAt: run.lastAdvanceAt.getTime(),
      runStartedAt: run.createdAt.getTime(),
    });

    if (!result.ok) {
      await bumpSuspicion(session.sessionId, result.suspicionDelta, result.reason);
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    if (result.died) {
      await prisma.crossyRun.update({
        where: { id: run.id },
        data: {
          status: "dead",
          currentLane: run.currentLane,
          laneTimestamps: JSON.stringify(stamps),
        },
      });
      return NextResponse.json({
        died: true,
        lane: run.currentLane,
        reason: result.reason,
      });
    }

    stamps.push(body.clientTimestamp);
    await prisma.crossyRun.update({
      where: { id: run.id },
      data: {
        currentLane: result.lane,
        lastAdvanceAt: new Date(body.clientTimestamp),
        laneTimestamps: JSON.stringify(stamps),
      },
    });

    const nextNonce = await issueNonce(session.sessionId, "crossy_advance");

    return NextResponse.json({
      died: false,
      lane: result.lane,
      payoutMultiplier: result.payoutMultiplier,
      nearMiss: result.nearMiss,
      screenShake: result.nearMiss,
      audioCue: result.nearMiss ? "close_call" : undefined,
      nextNonce,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
