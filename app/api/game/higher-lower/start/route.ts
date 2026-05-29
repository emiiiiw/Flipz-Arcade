import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  CHAIN_PAYOUTS,
  deckSeed,
  shuffleDeck,
  type Card,
} from "@/lib/games/higherLower";
import { tryDebitBetWagered } from "@/lib/session-debit";
import { MAX_BET, MIN_BET } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as { betAmount: number };
    const betAmount = Math.floor(Number(body.betAmount));
    if (!Number.isFinite(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
      return NextResponse.json({ error: "invalid_bet" }, { status: 400 });
    }

    const deck = shuffleDeck();
    const { seed, seedHash } = deckSeed();

    try {
      await prisma.$transaction(
        async (tx) => {
          const active = await tx.higherLowerGame.findFirst({
            where: { sessionId: session.sessionId, active: true },
          });
          if (active) {
            throw new Error("ACTIVE_GAME");
          }
          const ok = await tryDebitBetWagered(tx, session.sessionId, betAmount);
          if (!ok) {
            throw new Error("INSUFFICIENT_BALANCE");
          }
          await tx.higherLowerGame.create({
            data: {
              sessionId: session.sessionId,
              deckJson: JSON.stringify({ deck, seed, seedHash }),
              index: 0,
              round: 0,
              baseBet: betAmount,
              banked: 0,
              active: true,
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
      if ((e as Error).message === "ACTIVE_GAME") {
        return NextResponse.json({ error: "active_game" }, { status: 400 });
      }
      if ((e as Error).message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "insufficient_balance" }, { status: 400 });
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
        return NextResponse.json({ error: "conflict_retry" }, { status: 409 });
      }
      throw e;
    }

    const game = await prisma.higherLowerGame.findFirst({
      where: { sessionId: session.sessionId, active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!game) throw new Error("game_missing");

    const stored = JSON.parse(game.deckJson) as {
      deck: Card[];
      seed: string;
      seedHash: string;
    };
    const current = stored.deck[0];

    const updated = await prisma.session.findUniqueOrThrow({
      where: { id: session.sessionId },
    });

    return NextResponse.json({
      gameId: game.id,
      current,
      round: 0,
      multiplier: CHAIN_PAYOUTS[0],
      seedHash: stored.seedHash,
      newBalance: updated.balance,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
