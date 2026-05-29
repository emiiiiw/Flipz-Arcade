import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { CHAIN_PAYOUTS, type Card } from "@/lib/games/higherLower";
import { resolveCardGuess } from "@/server/games/cardsEngine";
import { getCardsEconomy } from "@/server/economy/configLoader";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as {
      gameId: string;
      guess?: "higher" | "lower";
      action: "guess" | "bank";
    };

    const game = await prisma.higherLowerGame.findFirst({
      where: { id: body.gameId, sessionId: session.sessionId, active: true },
    });
    if (!game) {
      return NextResponse.json({ error: "no_game" }, { status: 400 });
    }

    const stored = JSON.parse(game.deckJson) as {
      deck: Card[];
      seed: string;
      seedHash: string;
    };
    const { deck, seed, seedHash } = stored;

    if (body.action === "bank") {
      if (game.round === 0) {
        return NextResponse.json({ error: "nothing_to_bank" }, { status: 400 });
      }
      const mult = CHAIN_PAYOUTS[Math.min(game.round - 1, CHAIN_PAYOUTS.length - 1)];
      const gross = Math.floor(game.baseBet * mult);

      await prisma.$transaction(async (tx) => {
        await tx.session.update({
          where: { id: session.sessionId },
          data: {
            balance: { increment: gross },
            totalWon: { increment: gross },
          },
        });
        await tx.higherLowerGame.update({
          where: { id: game.id },
          data: { active: false },
        });
        await tx.bet.create({
          data: {
            sessionId: session.sessionId,
            game: "higher-lower",
            amount: game.baseBet,
            outcome: "banked",
            payout: gross,
            multiplier: mult,
            seedHash,
            seed,
            metadata: JSON.stringify({ gameId: game.id, rounds: game.round }),
          },
        });
      });

      const updated = await prisma.session.findUniqueOrThrow({
        where: { id: session.sessionId },
      });

      return NextResponse.json({
        ended: true,
        banked: gross,
        newBalance: updated.balance,
        seed,
        seedHash,
      });
    }

    if (!body.guess) {
      return NextResponse.json({ error: "guess_required" }, { status: 400 });
    }

    const currentIdx = game.index;
    if (!deck[currentIdx + 1]) {
      return NextResponse.json({ error: "deck_end" }, { status: 400 });
    }

    const cfg = await getCardsEconomy();
    const chain = cfg.chainMultipliers ?? [...CHAIN_PAYOUTS];

    const resolution = await resolveCardGuess({
      state: { deck, seed, seedHash, index: currentIdx },
      wager: game.baseBet,
      guess: body.guess,
      currentRound: game.round,
    });
    const next = resolution.nextCard;

    if (resolution.effectiveOutcome === "push") {
      const updatedGame = await prisma.higherLowerGame.update({
        where: { id: game.id },
        data: { index: currentIdx + 1 },
      });
      return NextResponse.json({
        push: true,
        nextCard: next,
        index: updatedGame.index,
        round: game.round,
        multiplier: chain[Math.min(game.round, chain.length - 1)],
      });
    }

    if (resolution.effectiveOutcome === "loss") {
      await prisma.$transaction(async (tx) => {
        await tx.higherLowerGame.update({
          where: { id: game.id },
          data: { active: false },
        });
        await tx.bet.create({
          data: {
            sessionId: session.sessionId,
            game: "higher-lower",
            amount: game.baseBet,
            outcome: "loss",
            payout: 0,
            seedHash,
            seed,
            metadata: JSON.stringify({ gameId: game.id }),
          },
        });
      });
      const updated = await prisma.session.findUniqueOrThrow({
        where: { id: session.sessionId },
      });
      return NextResponse.json({
        ended: true,
        outcome: "loss",
        nextCard: next,
        newBalance: updated.balance,
        seed,
        seedHash,
      });
    }

    const newRound = game.round + 1;
    const mult = chain[Math.min(newRound - 1, chain.length - 1)];

    if (newRound >= chain.length) {
      const gross = Math.floor(game.baseBet * mult);
      await prisma.$transaction(async (tx) => {
        await tx.session.update({
          where: { id: session.sessionId },
          data: {
            balance: { increment: gross },
            totalWon: { increment: gross },
          },
        });
        await tx.higherLowerGame.update({
          where: { id: game.id },
          data: { active: false, index: currentIdx + 1, round: newRound },
        });
        await tx.bet.create({
          data: {
            sessionId: session.sessionId,
            game: "higher-lower",
            amount: game.baseBet,
            outcome: "banked",
            payout: gross,
            multiplier: mult,
            seedHash,
            seed,
            metadata: JSON.stringify({ gameId: game.id, rounds: newRound, autoMax: true }),
          },
        });
      });
      const updated = await prisma.session.findUniqueOrThrow({
        where: { id: session.sessionId },
      });
      return NextResponse.json({
        ended: true,
        autoMax: true,
        banked: gross,
        newBalance: updated.balance,
        nextCard: next,
        seed,
        seedHash,
      });
    }

    const updatedGame = await prisma.higherLowerGame.update({
      where: { id: game.id },
      data: {
        index: currentIdx + 1,
        round: newRound,
      },
    });

    const canBank = newRound >= 1;

    return NextResponse.json({
      ended: false,
      outcome: "win",
      nextCard: next,
      round: updatedGame.round,
      multiplier: mult,
      canBank,
      maxed: false,
      seedHash,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
