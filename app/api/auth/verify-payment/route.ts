import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FleecaApiError, postFleecaPayment } from "@/lib/fleeca";
import { VERIFY_AMOUNT } from "@/lib/constants";

function fleecaHttpStatus(err: FleecaApiError): number {
  if (err.httpStatus >= 400 && err.httpStatus < 600) return err.httpStatus;
  return 502;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { routing: string };
    const routing = body.routing?.trim();
    if (!routing) {
      return NextResponse.json({ error: "routing required" }, { status: 400 });
    }

    const existing = await prisma.session.findUnique({ where: { routing } });
    if (existing) {
      return NextResponse.json(
        { error: "This routing is already registered. Log in from lobby." },
        { status: 400 },
      );
    }

    let paymentId: string;
    let paymentLink: string;
    try {
      const created = await postFleecaPayment({
        amount: VERIFY_AMOUNT,
        mode: 1,
        description: "Flipz Arcade — Identity Verification",
      });
      paymentId = created.paymentId;
      paymentLink = created.paymentLink;
    } catch (e) {
      console.error("[verify-payment] Fleeca error", e);
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
      const msg = e instanceof Error ? e.message : "verify_failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await prisma.payment.create({
      data: {
        fleecaId: paymentId,
        amount: VERIFY_AMOUNT,
        type: "verification",
        status: "pending",
        routing,
        displayName: null,
      },
    });

    return NextResponse.json({ paymentLink, paymentId });
  } catch (e) {
    console.error("[verify-payment]", e);
    const msg = e instanceof Error ? e.message : "verify_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
