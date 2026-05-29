import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";

type WebhookPayload = {
  payment_id: string;
  status: string;
  amount: number;
  payer_routing?: string;
  payer_name?: string;
};

export async function applySuccessfulPayment(
  payload: WebhookPayload,
): Promise<
  { ok: true; duplicate?: boolean } | { ok: false; error: string }
> {
  const { payment_id, amount, payer_routing, payer_name } = payload;
  const payment = await prisma.payment.findUnique({
    where: { fleecaId: payment_id },
  });
  if (!payment || payment.status === "completed") {
    return { ok: true, duplicate: true };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (payment.type === "verification") {
        const routing = payer_routing ?? payment.routing;
        const displayName = payer_name ?? payment.displayName ?? "Player";
        if (!routing) {
          throw new Error("missing_routing");
        }

        let session = await tx.session.findUnique({ where: { routing } });
        if (!session) {
          session = await tx.session.create({
            data: {
              routing,
              displayName,
              balance: amount,
              totalDeposited: amount,
            },
          });
        } else {
          session = await tx.session.update({
            where: { id: session.id },
            data: {
              balance: { increment: amount },
              totalDeposited: { increment: amount },
              displayName,
            },
          });
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "completed",
            sessionId: session.id,
            routing,
            displayName,
          },
        });
        await tx.session.update({
          where: { id: session.id },
          data: { isVerified: true },
        });
      } else if (payment.type === "deposit" && payment.sessionId) {
        await tx.session.update({
          where: { id: payment.sessionId },
          data: {
            balance: { increment: amount },
            totalDeposited: { increment: amount },
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "completed" },
        });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "missing_routing") {
      return { ok: false, error: "missing_routing" };
    }
    throw e;
  }

  return { ok: true, duplicate: false };
}

export async function trySetSessionCookieForRouting(routing: string) {
  const session = await prisma.session.findUnique({ where: { routing } });
  if (!session) return;
  cookies().set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}
