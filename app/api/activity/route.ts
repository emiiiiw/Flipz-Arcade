import { NextResponse } from "next/server";
import { getPublicFeed } from "@/server/services/activityFeed";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await getPublicFeed(40);
  return NextResponse.json({ feed });
}
