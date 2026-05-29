import { PrismaClient } from "@prisma/client";
import { ECONOMY_SEEDS } from "../server/economy/defaultConfigs";

const prisma = new PrismaClient();

const CARDS = [
  { slug: "neon-fox", name: "Neon Fox", rarity: "common" },
  { slug: "vault-king", name: "Vault King", rarity: "rare" },
  { slug: "cyber-ace", name: "Cyber Ace", rarity: "epic" },
  { slug: "gold-rush", name: "Gold Rush", rarity: "legendary" },
  { slug: "founder-prism", name: "Founder Prism", rarity: "mythic" },
];

async function main() {
  for (const [gameKey, config] of Object.entries(ECONOMY_SEEDS)) {
    await prisma.economySetting.upsert({
      where: { gameKey },
      create: { gameKey, config: JSON.stringify(config), updatedBy: "seed" },
      update: { config: JSON.stringify(config), updatedBy: "seed" },
    });
  }

  for (const c of CARDS) {
    await prisma.cardDefinition.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, rarity: c.rarity, baseHoloRate: 0.08 },
      update: { name: c.name, rarity: c.rarity },
    });
  }

  const pack = await prisma.packDefinition.upsert({
    where: { slug: "arcade-standard" },
    create: {
      slug: "arcade-standard",
      name: "Arcade Standard Pack",
      price: 50_000,
      season: "S1",
    },
    update: {},
  });

  const cards = await prisma.cardDefinition.findMany();
  for (const card of cards) {
    const weight =
      card.rarity === "mythic"
        ? 1
        : card.rarity === "legendary"
          ? 4
          : card.rarity === "epic"
            ? 15
            : card.rarity === "rare"
              ? 30
              : 50;
    await prisma.packPoolEntry.upsert({
      where: { id: `${pack.id}-${card.id}` },
      create: { id: `${pack.id}-${card.id}`, packId: pack.id, cardId: card.id, weight },
      update: { weight },
    });
  }

  for (const game of ["crash", "crossy", "coinflip", "higher_lower"]) {
    await prisma.jackpot.upsert({
      where: { game },
      create: { game, poolAmount: 1_000_000, contributionRate: 0.01 },
      update: {},
    });
  }

  console.log("Seed complete: economy, cards, packs, jackpots");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
