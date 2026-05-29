import { NextRequest } from "next/server";
import crypto from "crypto";
import { applySuccessfulPayment, trySetSessionCookieForRouting } from "@/lib/payments";
import { prisma } from "@/lib/db";

function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function GET() {
  return new Response("Webhook OK", { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const apiKey = process.env.FLEECA_API_KEY?.trim();
    if (!apiKey) {
      console.error("[webhook] FLEECA_API_KEY is not set");
      return new Response("Server misconfigured", { status: 500 });
    }

    const signature = req.headers.get("x-fleeca-signature") || "";
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", apiKey).update(rawBody, "utf8").digest("hex");

    if (!timingSafeEqualString(signature, expected)) {
      console.warn("[webhook] invalid x-fleeca-signature");
      return new Response("Invalid signature", { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch (e) {
      console.error("[webhook] invalid JSON", e);
      return new Response("Bad JSON", { status: 400 });
    }

    const status = payload.status;

    if (status === "payment_successful") {
      try {
        const payment_id = String(payload.payment_id ?? "");
        const amount = Number(payload.amount);
        const payer_routing =
          typeof payload.payer_routing === "string" ? payload.payer_routing : undefined;
        const payer_name =
          typeof payload.payer_name === "string" ? payload.payer_name : undefined;

        if (!payment_id) {
          console.warn("[webhook] payment_successful missing payment_id");
        } else if (!Number.isFinite(amount)) {
          console.warn("[webhook] payment_successful invalid amount", payload.amount);
        } else {
          const result = await applySuccessfulPayment({
            payment_id,
            status: "payment_successful",
            amount,
            payer_routing,
            payer_name,
          });
          if (result.ok === false) {
            console.error("[webhook] applySuccessfulPayment:", result.error);
          }
          const routing = payer_routing;
          if (routing) {
            try {
              await trySetSessionCookieForRouting(routing);
            } catch (cookieErr) {
              console.error("[webhook] trySetSessionCookieForRouting", cookieErr);
            }
          }
        }
      } catch (e) {
        console.error("[webhook] payment_successful handler", e);
      }
    }

    if (status === "payment_failed") {
      try {
        const payment_id = String(payload.payment_id ?? "");
        if (payment_id) {
          await prisma.payment.updateMany({
            where: { fleecaId: payment_id, status: "pending" },
            data: { status: "failed" },
          });
        }
      } catch (e) {
        console.error("[webhook] payment_failed handler", e);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("[webhook] unhandled error", e);
    return new Response("OK", { status: 200 });
  }
}
