import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/apiJson";
import { createPayment, FleecaApiError } from "@/lib/fleeca";
import { requireSession } from "@/lib/session";
import { DEPOSIT_MAX, DEPOSIT_MIN } from "@/lib/constants";

export const dynamic = "force-dynamic";

function fleecaHttpStatus(err: FleecaApiError): number {
  if (err.httpStatus >= 400 && err.httpStatus < 600) return err.httpStatus;
  return 502;
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const parsed = await parseJsonBody<{ amount: number }>(req);
    if (!parsed.ok) return parsed.response;

    const amount = Math.floor(Number(parsed.body.amount));
    if (!Number.isFinite(amount) || amount < DEPOSIT_MIN || amount > DEPOSIT_MAX) {
      return apiError("invalid_amount", 400);
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
            success: false,
            error: e.message,
            fleecaStatus: e.httpStatus,
            fleecaBody: e.body,
          },
          { status: fleecaHttpStatus(e) },
        );
      }
      const msg = e instanceof Error ? e.message : "deposit_failed";
      return apiError(msg, 500);
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

    return apiSuccess({ paymentLink, paymentId });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return apiError("unauthorized", 401);
    }
    console.error("[deposit]", e);
    const msg = e instanceof Error ? e.message : "deposit_failed";
    return apiError(msg, 500);
  }
}
