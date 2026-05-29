import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  applySuccessfulPayment,
  trySetSessionCookieForRouting,
} from "@/lib/payments";

/** Dev helper: completes a mock Fleeca payment without webhook. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("payment_id");
  const amount = Number(url.searchParams.get("amount") ?? "0");
  if (!paymentId?.startsWith("mock_")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const payment = await prisma.payment.findUnique({
    where: { fleecaId: paymentId },
  });
  if (!payment) return NextResponse.json({ error: "unknown_payment" }, { status: 404 });

  const routing = payment.routing ?? "000000000";
  await applySuccessfulPayment({
    payment_id: paymentId,
    status: "payment_successful",
    amount: amount || payment.amount,
    payer_routing: routing,
    payer_name: payment.displayName ?? "Mock Player",
  });

  await trySetSessionCookieForRouting(routing);
  return NextResponse.redirect(new URL("/lobby", req.url));
}
