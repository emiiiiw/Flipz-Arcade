"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@/store/session";
import { MIN_BET, MAX_BET } from "@/lib/constants";

type Phase = "betting" | "flying" | "ended";

type State = {
  roundId: string;
  seedHash: string;
  phase: Phase;
  multiplier?: number;
  crashPoint?: number;
  seed?: string;
  history: number[];
};

export function CrashGame() {
  const patchBalance = useSessionStore((s) => s.patchBalance);
  const [state, setState] = useState<State | null>(null);
  const [bet, setBet] = useState(20_000);
  const [auto, setAuto] = useState(2);
  const [betId, setBetId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/game/crash/stream");
    esRef.current = es;
    es.onmessage = (ev) => {
      const data = JSON.parse(ev.data) as State;
      setState(data);
    };
    return () => es.close();
  }, []);

  async function placeBet() {
    setMsg(null);
    const res = await fetch("/api/game/crash/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betAmount: bet, autoCash: auto }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "failed");
      return;
    }
    setBetId(data.betId);
    patchBalance(data.newBalance);
  }

  async function cashout() {
    if (!betId) return;
    const res = await fetch("/api/game/crash/cashout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "failed");
      return;
    }
    setBetId(null);
    patchBalance(data.newBalance);
    setMsg(`Cashed at ${data.mult}x → +$${data.payout.toLocaleString()}`);
  }

  const canBet = state?.phase === "betting";
  const canCash = state?.phase === "flying" && betId;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/lobby" className="text-sm text-flipz-cyan underline">
        ← Lobby
      </Link>
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-white/50">Multiplier</p>
            <p className="text-6xl font-black text-emerald-400">
              {(state?.multiplier ?? 1).toFixed(2)}x
            </p>
            <p className="text-xs text-white/40">
              Phase: {state?.phase ?? "…"} · ~30% mass at 1.00× · Seed hash{" "}
              <span className="break-all">{state?.seedHash?.slice(0, 16)}…</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="number"
              min={MIN_BET}
              max={MAX_BET}
              value={bet}
              onChange={(e) => setBet(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/50 px-3 py-2"
            />
            <input
              type="number"
              step={0.01}
              min={1.01}
              value={auto}
              onChange={(e) => setAuto(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/50 px-3 py-2"
              title="Auto cash multiplier"
            />
            <button
              type="button"
              disabled={!canBet}
              onClick={() => void placeBet()}
              className="rounded-lg bg-flipz-pink py-2 font-semibold text-black disabled:opacity-30"
            >
              Place bet
            </button>
            <button
              type="button"
              disabled={!canCash}
              onClick={() => void cashout()}
              className="rounded-lg bg-emerald-400 py-2 font-semibold text-black disabled:opacity-30"
            >
              Cash out
            </button>
          </div>
        </div>
        {state?.phase === "ended" && state.seed && (
          <p className="mt-4 break-all text-xs text-white/50">
            Last seed (verify): {state.seed}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {state?.history?.slice(0, 12).map((h, i) => (
            <span
              key={i}
              className={`rounded-full px-3 py-1 text-xs ${
                h < 1.5 ? "bg-rose-500/30" : h < 3 ? "bg-amber-400/30" : "bg-emerald-500/30"
              }`}
            >
              {h.toFixed(2)}x
            </span>
          ))}
        </div>
        {msg && <p className="mt-4 text-sm text-amber-200">{msg}</p>}
      </div>
    </div>
  );
}
