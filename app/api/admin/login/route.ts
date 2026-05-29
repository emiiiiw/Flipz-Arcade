import { NextResponse } from "next/server";
import {
  createAdminSession,
  setAdminCookie,
  verifyAdminCredentials,
} from "@/server/admin/auth";
import { logAdminAction } from "@/server/security/audit";

export async function POST(req: Request) {
  const body = (await req.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await createAdminSession(username);
  setAdminCookie(token);
  await logAdminAction(username, "admin_login");

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { clearAdminCookie } = await import("@/server/admin/auth");
  clearAdminCookie();
  return NextResponse.json({ ok: true });
}
