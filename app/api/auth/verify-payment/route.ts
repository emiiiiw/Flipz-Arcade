import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/apiJson";
import { FleecaApiError, postFleecaPayment } from "@/lib/fleeca";
import { VERIFY_AMOUNT } from "@/lib/constants";
import { logAuthEnvStatus } from "@/lib/env";
import { lookupFleecaRouting } from "@/lib/fleecaLookup";

export const dynamic = "force-dynamic";

function fleecaHttpStatus(err: FleecaApiError): number {
  if (err.httpStatus >= 400 && err.httpStatus < 600) return err.httpStatus;
  return 502;
}

export async function POST(req: Request) {
  try {
    logAuthEnvStatus();

    if (!process.env.FLEECA_API_KEY?.trim()) {
      return apiError("Missing FLEECA_API_KEY — configure server environment", 500);
    }

    const parsed = await parseJsonBody<{ routing?: string; routingNumber?: string }>(req);
    if (!parsed.ok) return parsed.response;

    const routing = (parsed.body.routing ?? parsed.body.routingNumber ?? "").trim();
    if (!routing) {
      return apiError("routing required", 400);
    }

    const lookup = await lookupFleecaRouting(routing);
    if (!lookup.valid) {
      return apiError(lookup.message ?? "Invalid routing number", 400, { lookup });
    }

    const existing = await prisma.session.findUnique({ where: { routing } });
    if (existing) {
      return apiError(
        "This routing is already registered. Log in as a returning player.",
        400,
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
            success: false,
            error: e.message,
            fleecaStatus: e.httpStatus,
            fleecaBody: e.body,
          },
          { status: fleecaHttpStatus(e) },
        );
      }
      const msg = e instanceof Error ? e.message : "verify_failed";
      return apiError(msg, 500);
    }

    await prisma.payment.create({
      data: {
        fleecaId: paymentId,
        amount: VERIFY_AMOUNT,
        type: "verification",
        status: "pending",
        routing,
        displayName: lookup.accountName ?? null,
      },
    });

    return apiSuccess({ paymentLink, paymentId, lookup });
  } catch (e) {
    console.error("[verify-payment]", e);
    const msg = e instanceof Error ? e.message : "verify_failed";
    return apiError(msg, 500);
  }
}
