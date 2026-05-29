import { prisma } from "@/lib/db";
import { randomUintBelow } from "@/lib/rng";

const FILLER_NAMES = [
  "NeonFox",
  "VaultKing",
  "LaneRunner",
  "CryptoAce",
  "GoldRush",
  "MidnightWhale",
  "PixelShark",
  "StakeDreamer",
];

function randomFillerMessage(name: string): string {
  const roll = randomUintBelow(4);
  const amount = 50_000 + randomUintBelow(9_000_000);
  const mult = 1.5 + randomUintBelow(150) / 10;
  if (roll === 0) return `${name} just won $${amount.toLocaleString()}`;
  if (roll === 1) return `${name} opened a Mythic Card`;
  if (roll === 2) return `${name} hit ${mult.toFixed(1)}x`;
  return `Biggest win this hour: $${(2_000_000 + randomUintBelow(8_000_000)).toLocaleString()}`;
}

export async function recordActivityWin(params: {
  displayName: string;
  amount: number;
  multiplier?: number;
  game?: string;
  isSynthetic: boolean;
}): Promise<void> {
  const msg =
    params.multiplier && params.multiplier > 2
      ? `${params.displayName} hit ${params.multiplier.toFixed(1)}x — $${params.amount.toLocaleString()}`
      : `${params.displayName} just won $${params.amount.toLocaleString()}`;

  await prisma.activityFeedEvent.create({
    data: {
      kind: "win",
      displayName: params.displayName,
      message: msg,
      amount: params.amount,
      multiplier: params.multiplier,
      isSynthetic: params.isSynthetic,
      priority: params.amount > 1_000_000 ? 10 : 5,
    },
  });
}

/** Mix synthetic filler with real events for Stake-style density */
export async function ensureFeedDensity(minCount = 12): Promise<void> {
  const recent = await prisma.activityFeedEvent.count({
    where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  const need = Math.max(0, minCount - recent);
  for (let i = 0; i < need; i++) {
    const name = FILLER_NAMES[randomUintBelow(FILLER_NAMES.length)]!;
    const amount = 50_000 + randomUintBelow(9_000_000);
    const mult = 1.5 + randomUintBelow(150) / 10;
    await prisma.activityFeedEvent.create({
      data: {
        kind: "filler",
        displayName: name,
        message: randomFillerMessage(name),
        amount,
        multiplier: mult,
        isSynthetic: true,
        priority: 1,
      },
    });
  }
}

export async function getPublicFeed(limit = 30) {
  try {
    await ensureFeedDensity();
  } catch (e) {
    console.warn("[activityFeed] ensureFeedDensity skipped:", e);
  }

  const rows = await prisma.activityFeedEvent.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    displayName: r.displayName,
    amount: r.amount,
    multiplier: r.multiplier,
    kind: r.kind,
    at: r.createdAt.toISOString(),
  }));
}
