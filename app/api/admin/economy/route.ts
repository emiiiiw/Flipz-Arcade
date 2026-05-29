import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import {
  ensureEconomySeeded,
  getGameEconomy,
  upsertEconomyConfig,
} from "@/server/economy/configLoader";
import { ECONOMY_SEEDS } from "@/server/economy/defaultConfigs";
import { logAdminAction } from "@/server/security/audit";
import { prisma } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await ensureEconomySeeded();
  const rows = await prisma.economySetting.findMany({ orderBy: { gameKey: "asc" } });
  const settings: Record<string, unknown> = {};
  for (const r of rows) {
    settings[r.gameKey] = JSON.parse(r.config);
  }
  return NextResponse.json({ settings, defaults: ECONOMY_SEEDS });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { gameKey: string; config: unknown };
  if (!body.gameKey || body.config === undefined) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await upsertEconomyConfig(body.gameKey, body.config, admin.username);
  await logAdminAction(admin.username, "economy_update", {
    gameKey: body.gameKey,
  });

  const cfg = await getGameEconomy(body.gameKey);
  return NextResponse.json({ ok: true, config: cfg });
}
