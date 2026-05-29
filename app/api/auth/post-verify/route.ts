import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * After Fleeca redirects the player back, call this with `routing` so the
 * browser receives the httpOnly session cookie (webhooks are server-to-server).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const routing = url.searchParams.get("routing")?.trim();
  if (!routing) {
    return NextResponse.json({ error: "routing required" }, { status: 400 });
  }
  const session = await prisma.session.findUnique({ where: { routing } });
  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const pending = await prisma.payment.findFirst({
    where: {
      routing,
      type: "verification",
      status: "pending",
    },
  });
  if (pending) {
    return NextResponse.json({ error: "verification_pending" }, { status: 400 });
  }

  const res = NextResponse.json({
    ok: true,
    displayName: session.displayName,
    balance: session.balance,
  });
  res.cookies.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
