import crypto from "crypto";
import { prisma } from "@/lib/db";
import { multiplierAtTime } from "@/lib/games/crash";
import { planCrashRound } from "@/server/games/crashEngine";
import { sha256Hex } from "@/lib/rng";

export type CrashPublicState = {
  roundId: string;
  seedHash: string;
  phase: "betting" | "flying" | "ended";
  phaseEndsAt: number;
  serverNow: number;
  crashPoint?: number;
  seed?: string;
  multiplier?: number;
  history: number[];
};

type BetRow = {
  id: string;
  sessionId: string;
  amount: number;
  autoCash?: number;
  status: "open" | "cashed" | "lost";
};

const HISTORY_LEN = 20;

class CrashEngine {
  roundId = "";
  seed = "";
  seedHash = "";
  crashPoint = 1.01;
  phase: CrashPublicState["phase"] = "ended";
  phaseEndsAt = 0;
  flightStartedAt = 0;
  crashTimeMs = 0;
  bets = new Map<string, BetRow>();
  history: number[] = [];
  timer: ReturnType<typeof setInterval> | null = null;
  listeners = new Set<(s: CrashPublicState) => void>();
  private finalizing = false;

  constructor() {
    if (typeof window === "undefined") {
      this.startLoop();
    }
  }

  subscribe(fn: (s: CrashPublicState) => void) {
    this.listeners.add(fn);
    fn(this.getPublicState());
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const state = this.getPublicState();
    this.listeners.forEach((l) => l(state));
  }

  getPublicState(): CrashPublicState {
    const now = Date.now();
    let multiplier: number | undefined;
    if (this.phase === "flying") {
      const elapsed = Math.max(0, now - this.flightStartedAt);
      const raw = multiplierAtTime(elapsed);
      multiplier = Math.min(raw, this.crashPoint);
    }
    return {
      roundId: this.roundId,
      seedHash: this.seedHash,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: now,
      crashPoint: this.phase === "ended" ? this.crashPoint : undefined,
      seed: this.phase === "ended" ? this.seed : undefined,
      multiplier,
      history: [...this.history],
    };
  }

  private startLoop() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 100);
    this.beginRound();
  }

  private beginRound() {
    void this.beginRoundAsync();
  }

  private async beginRoundAsync() {
    this.finalizing = false;
    const plan = await planCrashRound();
    this.roundId = plan.roundId;
    this.seed = plan.seed;
    this.seedHash = plan.seedHash;
    this.crashPoint = plan.crashPoint;
    this.phase = "betting";
    this.phaseEndsAt = Date.now() + 10_000;
    this.bets.clear();
    this.emit();
  }

  private async tick() {
    const now = Date.now();
    if (this.phase === "betting" && now >= this.phaseEndsAt) {
      this.phase = "flying";
      this.flightStartedAt = now;
      const maxFlight = 20_000;
      this.crashTimeMs = Math.min(maxFlight, Math.log(this.crashPoint) * 8000);
      this.phaseEndsAt = now + this.crashTimeMs;
      this.emit();
      return;
    }

    if (this.phase === "flying" && !this.finalizing) {
      const elapsed = now - this.flightStartedAt;
      const mult = multiplierAtTime(elapsed);
      if (mult >= this.crashPoint - 1e-6 || elapsed >= this.crashTimeMs) {
        this.finalizing = true;
        const shown = Math.min(mult, this.crashPoint);
        await this.settleRound(shown);
        this.phase = "ended";
        this.emit();
        setTimeout(() => this.beginRound(), 1500);
      } else {
        this.emit();
      }
    }
  }

  private async settleRound(multShown: number) {
    for (const bet of [...this.bets.values()]) {
      if (bet.status !== "open") continue;
      const auto = bet.autoCash;
      if (auto && auto <= multShown) {
        await this.cashBetInternal(bet.id, Math.min(auto, multShown));
        continue;
      }
      await prisma.$transaction(async (tx) => {
        await tx.bet.create({
          data: {
            sessionId: bet.sessionId,
            game: "crash",
            amount: bet.amount,
            outcome: "loss",
            payout: 0,
            multiplier: multShown,
            seedHash: this.seedHash,
            seed: this.seed,
            metadata: JSON.stringify({ roundId: this.roundId, betId: bet.id }),
          },
        });
      });
      bet.status = "lost";
    }
    this.history.unshift(this.crashPoint);
    if (this.history.length > HISTORY_LEN) this.history.pop();
  }

  async placeBet(sessionId: string, amount: number, autoCash?: number) {
    if (this.phase !== "betting") {
      throw new Error("betting_closed");
    }
    const id = crypto.randomUUID();
    this.bets.set(id, {
      id,
      sessionId,
      amount,
      autoCash,
      status: "open",
    });
    this.emit();
    return { betId: id };
  }

  async cashBet(sessionId: string, betId: string) {
    const bet = this.bets.get(betId);
    if (!bet || bet.sessionId !== sessionId) throw new Error("no_bet");
    if (bet.status !== "open") throw new Error("already_closed");
    if (this.phase !== "flying") throw new Error("not_flying");
    const elapsed = Date.now() - this.flightStartedAt;
    const mult = Math.min(multiplierAtTime(elapsed), this.crashPoint);
    return this.cashBetInternal(betId, mult);
  }

  private async cashBetInternal(betId: string, mult: number) {
    const bet = this.bets.get(betId);
    if (!bet || bet.status !== "open") {
      throw new Error("no_bet");
    }
    const payout = Math.floor(bet.amount * mult);
    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: bet.sessionId },
        data: {
          balance: { increment: payout },
          totalWon: { increment: payout },
        },
      });
      await tx.bet.create({
        data: {
          sessionId: bet.sessionId,
          game: "crash",
          amount: bet.amount,
          outcome: "win",
          payout,
          multiplier: mult,
          seedHash: this.seedHash,
          seed: this.seed,
          metadata: JSON.stringify({ roundId: this.roundId, betId }),
        },
      });
    });
    bet.status = "cashed";
    this.emit();
    const row = await prisma.session.findUniqueOrThrow({ where: { id: bet.sessionId } });
    return { payout, newBalance: row.balance, mult };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __flipzCrash: CrashEngine | undefined;
}

export function getCrashEngine(): CrashEngine {
  if (typeof window !== "undefined") {
    throw new Error("Crash engine is server-only");
  }
  if (!globalThis.__flipzCrash) {
    globalThis.__flipzCrash = new CrashEngine();
  }
  return globalThis.__flipzCrash;
}
