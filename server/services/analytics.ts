import { prisma } from "@/lib/db";

export type AdminAnalytics = {
  totalDeposits: number;
  totalWithdrawals: number;
  netHouseProfit: number;
  profitByGame: Record<string, number>;
  rtpByGame: Record<string, number>;
  hourlyActiveUsers: number;
  averageWager: number;
  whaleCount: number;
  vipBreakdown: Record<string, number>;
  jackpotPools: { game: string; poolAmount: number }[];
};

const WHALE_WAGERED = 5_000_000;

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000);

  const [deposits, withdrawals, rounds, sessionsHour, vipRows, jackpots] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { type: "deposit", status: "completed" },
        _sum: { amount: true },
      }),
      prisma.withdrawalRequest.aggregate({
        where: { status: "completed" },
        _sum: { amount: true },
      }),
      prisma.gameRound.findMany({
        select: { game: true, wager: true, payout: true, houseProfit: true },
      }),
      prisma.session.count({ where: { lastActiveAt: { gte: sinceHour } } }),
      prisma.session.groupBy({
        by: ["vipTier"],
        _count: { id: true },
      }),
      prisma.jackpot.findMany({ select: { game: true, poolAmount: true } }),
    ]);

  const profitByGame: Record<string, number> = {};
  const wagerByGame: Record<string, number> = {};
  const payoutByGame: Record<string, number> = {};
  let totalWager = 0;

  for (const r of rounds) {
    profitByGame[r.game] = (profitByGame[r.game] ?? 0) + r.houseProfit;
    wagerByGame[r.game] = (wagerByGame[r.game] ?? 0) + r.wager;
    payoutByGame[r.game] = (payoutByGame[r.game] ?? 0) + r.payout;
    totalWager += r.wager;
  }

  const rtpByGame: Record<string, number> = {};
  for (const g of Object.keys(wagerByGame)) {
    const w = wagerByGame[g]!;
    rtpByGame[g] = w > 0 ? (payoutByGame[g] ?? 0) / w : 0;
  }

  const whales = await prisma.session.count({
    where: { totalWagered: { gte: WHALE_WAGERED } },
  });

  const vipBreakdown: Record<string, number> = {};
  for (const v of vipRows) {
    vipBreakdown[v.vipTier] = v._count.id;
  }

  const netHouseProfit = rounds.reduce((s, r) => s + r.houseProfit, 0);

  return {
    totalDeposits: deposits._sum.amount ?? 0,
    totalWithdrawals: withdrawals._sum.amount ?? 0,
    netHouseProfit,
    profitByGame,
    rtpByGame,
    hourlyActiveUsers: sessionsHour,
    averageWager: rounds.length ? Math.floor(totalWager / rounds.length) : 0,
    whaleCount: whales,
    vipBreakdown,
    jackpotPools: jackpots,
  };
}
