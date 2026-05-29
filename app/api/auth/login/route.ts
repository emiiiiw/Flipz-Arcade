import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const body = (await req.json()) as { routing: string };
  const routing = body.routing?.trim();
  if (!routing) {
    return NextResponse.json({ error: "routing required" }, { status: 400 });
  }
  const session = await prisma.session.findUnique({ where: { routing } });
  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const res = NextResponse.json({
    ok: true,
    sessionId: session.id,
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
