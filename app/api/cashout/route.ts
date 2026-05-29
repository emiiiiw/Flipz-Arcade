import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { CASHOUT_FEE_FLAT, MIN_CASHOUT_GROSS } from "@/lib/constants";
import { FleecaApiError, postFleecaTransfers } from "@/lib/fleeca";

function fleecaHttpStatus(err: FleecaApiError): number {
  if (err.httpStatus >= 400 && err.httpStatus < 600) return err.httpStatus;
  return 502;
}

const ACCOUNT_ACTIVATION_FEE = 20_000;

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const row = await prisma.session.findUniqueOrThrow({
      where: { id: session.sessionId },
    });

    if (!row.isVerified) {
      return NextResponse.json(
        {
          error: "verification_required",
          activationFee: ACCOUNT_ACTIVATION_FEE,
          message: `Premium withdrawals require verification. Pay $${ACCOUNT_ACTIVATION_FEE.toLocaleString()} activation fee via /api/auth/verify-payment.`,
        },
        { status: 403 },
      );
    }

    const body = (await req.json()) as { amount?: number };
    const gross = Math.floor(Number(body.amount));

    if (!Number.isFinite(gross) || gross < MIN_CASHOUT_GROSS) {
      return NextResponse.json(
        { error: `Minimum cashout is $${MIN_CASHOUT_GROSS.toLocaleString()}` },
        { status: 400 },
      );
    }

    const net = gross - CASHOUT_FEE_FLAT;
    if (net <= 0) {
      return NextResponse.json(
        { error: "Amount after fee must leave a positive payout" },
        { status: 400 },
      );
    }

    const reserved = await prisma.session.updateMany({
      where: { id: session.sessionId, balance: { gte: gross } },
      data: { balance: { decrement: gross } },
    });

    if (reserved.count !== 1) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    try {
      await postFleecaTransfers([
        {
          routing: session.routing,
          amount: net,
          description: "Flipz Arcade — Cashout",
        },
      ]);
    } catch (e) {
      await prisma.session.update({
        where: { id: session.sessionId },
        data: { balance: { increment: gross } },
      });
      console.error("[cashout] Fleeca transfer failed", e);
      if (e instanceof FleecaApiError) {
        return NextResponse.json(
          {
            error: e.message,
            fleecaStatus: e.httpStatus,
            fleecaBody: e.body,
          },
          { status: fleecaHttpStatus(e) },
        );
      }
      const msg = e instanceof Error ? e.message : "cashout_failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      gross,
      fee: CASHOUT_FEE_FLAT,
      net,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[cashout]", e);
    const msg = e instanceof Error ? e.message : "cashout_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
