import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminAnalytics } from "@/server/services/analytics";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await getAdminAnalytics();
  return NextResponse.json(data);
}
