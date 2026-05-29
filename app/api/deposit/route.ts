import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPayment, FleecaApiError } from "@/lib/fleeca";
import { requireSession } from "@/lib/session";
import { DEPOSIT_MAX, DEPOSIT_MIN } from "@/lib/constants";

function fleecaHttpStatus(err: FleecaApiError): number {
  if (err.httpStatus >= 400 && err.httpStatus < 600) return err.httpStatus;
  return 502;
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as { amount: number };
    const amount = Math.floor(Number(body.amount));
    if (!Number.isFinite(amount) || amount < DEPOSIT_MIN || amount > DEPOSIT_MAX) {
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    }

    let paymentId: string;
    let paymentLink: string;
    try {
      const created = await createPayment({
        amount,
        mode: 1,
        description: `Flipz Arcade deposit — ${session.displayName}`,
        redirect_url: `${process.env.BASE_URL ?? ""}/lobby`,
      });
      paymentId = created.paymentId;
      paymentLink = created.paymentLink;
    } catch (e) {
      console.error("[deposit] Fleeca error", e);
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
      const msg = e instanceof Error ? e.message : "deposit_failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await prisma.payment.create({
      data: {
        fleecaId: paymentId,
        sessionId: session.sessionId,
        amount,
        type: "deposit",
        status: "pending",
      },
    });

    return NextResponse.json({ paymentLink, paymentId });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[deposit]", e);
    const msg = e instanceof Error ? e.message : "deposit_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
