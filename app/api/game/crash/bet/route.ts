import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getCrashEngine } from "@/lib/crash-engine";
import { tryDebitBetWagered } from "@/lib/session-debit";
import { MAX_BET, MIN_BET } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as {
      betAmount: number;
      autoCash?: number;
    };
    const betAmount = Math.floor(Number(body.betAmount));
    const autoCash = body.autoCash
      ? Math.max(1, Number(body.autoCash))
      : undefined;
    if (!Number.isFinite(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
      return NextResponse.json({ error: "invalid_bet" }, { status: 400 });
    }

    const engine = getCrashEngine();

    let debited = false;
    try {
      await prisma.$transaction(async (tx) => {
        const ok = await tryDebitBetWagered(tx, session.sessionId, betAmount);
        if (!ok) {
          throw new Error("INSUFFICIENT_BALANCE");
        }
        debited = true;
      });
    } catch (e) {
      if ((e as Error).message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "insufficient_balance" }, { status: 400 });
      }
      throw e;
    }

    let betId: string;
    try {
      ({ betId } = await engine.placeBet(session.sessionId, betAmount, autoCash));
    } catch (e) {
      if (debited) {
        await prisma.session.update({
          where: { id: session.sessionId },
          data: {
            balance: { increment: betAmount },
            totalWagered: { increment: -betAmount },
          },
        });
      }
      throw e;
    }

    const updated = await prisma.session.findUniqueOrThrow({
      where: { id: session.sessionId },
    });

    return NextResponse.json({ betId, newBalance: updated.balance });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (msg === "betting_closed") {
      return NextResponse.json({ error: "betting_closed" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
