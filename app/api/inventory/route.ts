import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const items = await prisma.inventoryItem.findMany({
      where: { sessionId: session.sessionId },
      include: { card: true },
      orderBy: { acquiredAt: "desc" },
    });
    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        serialNumber: i.serialNumber,
        isHolographic: i.isHolographic,
        card: { name: i.card.name, rarity: i.card.rarity, slug: i.card.slug },
      })),
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
