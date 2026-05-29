import { prisma } from "@/lib/db";
import { randomUintBelow } from "@/lib/rng";
import { recordActivityWin } from "./activityFeed";

const RARITY_ORDER = ["common", "rare", "epic", "legendary", "mythic"] as const;

export async function openPack(sessionId: string, packSlug: string, displayName: string) {
  const pack = await prisma.packDefinition.findUnique({
    where: { slug: packSlug },
    include: { pool: { include: { card: true } } },
  });
  if (!pack?.active || pack.pool.length === 0) throw new Error("PACK_UNAVAILABLE");

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.balance < pack.price) throw new Error("INSUFFICIENT_BALANCE");

  const totalWeight = pack.pool.reduce((s, e) => s + e.weight, 0);
  let roll = randomUintBelow(totalWeight);
  let picked = pack.pool[0]!;
  for (const entry of pack.pool) {
    roll -= entry.weight;
    if (roll < 0) {
      picked = entry;
      break;
    }
  }

  const isHolo = randomUintBelow(1000) < Math.floor((picked.card.baseHoloRate ?? 0.05) * 1000);
  const serial =
    (await prisma.inventoryItem.count({ where: { cardId: picked.cardId } })) + 1;

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: sessionId },
      data: { balance: { decrement: pack.price }, totalWagered: { increment: pack.price } },
    });
    await tx.inventoryItem.create({
      data: {
        sessionId,
        cardId: picked.cardId,
        serialNumber: serial,
        isHolographic: isHolo,
      },
    });
    await tx.packOpen.create({
      data: { sessionId, packId: pack.id, cardId: picked.cardId, isHolo },
    });
  });

  const card = picked.card;
  if (RARITY_ORDER.indexOf(card.rarity as (typeof RARITY_ORDER)[number]) >= 3) {
    await recordActivityWin({
      displayName,
      amount: pack.price * 10,
      game: "packs",
      isSynthetic: false,
      multiplier: undefined,
    });
    await prisma.activityFeedEvent.create({
      data: {
        kind: "card_pull",
        displayName,
        message: `${displayName} pulled ${card.rarity.toUpperCase()}: ${card.name}${isHolo ? " ✦ HOLO" : ""}`,
        isSynthetic: false,
        priority: 8,
      },
    });
  }

  return {
    card: {
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      serialNumber: serial,
      isHolographic: isHolo,
    },
  };
}
