"use client";

import { useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@/store/session";
import { CHAIN_PAYOUTS, MIN_BET, MAX_BET } from "@/lib/constants";

type Card = { suit: string; value: number };

function label(c: Card) {
  const names: Record<number, string> = {
    1: "A",
    11: "J",
    12: "Q",
    13: "K",
  };
  const v = names[c.value] ?? String(c.value);
  return `${v}${c.suit}`;
}

export function HigherLowerGame() {
  const patchBalance = useSessionStore((s) => s.patchBalance);
  const [bet, setBet] = useState(20_000);
  const [gameId, setGameId] = useState<string | null>(null);
  const [current, setCurrent] = useState<Card | null>(null);
  const [round, setRound] = useState(0);
  const [mult, setMult] = useState(CHAIN_PAYOUTS[0]);
  const [history, setHistory] = useState<Card[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function start() {
    setMsg(null);
    const res = await fetch("/api/game/higher-lower/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betAmount: bet }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "failed");
      return;
    }
    setGameId(data.gameId);
    setCurrent(data.current);
    setRound(data.round);
    setMult(data.multiplier);
    setHistory([data.current]);
    patchBalance(data.newBalance);
  }

  async function guess(g: "higher" | "lower") {
    if (!gameId) return;
    setMsg(null);
    const res = await fetch("/api/game/higher-lower/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, guess: g, action: "guess" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "failed");
      return;
    }
    if (data.push) {
      setCurrent(data.nextCard);
      setHistory((h) => [...h, data.nextCard]);
      setMsg("Push — next card (no change to multiplier chain).");
      return;
    }
    if (data.ended) {
      setGameId(null);
      setCurrent(null);
      setHistory([]);
      patchBalance(data.newBalance);
      if (data.autoMax) {
        setMsg(`Max chain — auto banked $${data.banked.toLocaleString()}`);
      } else {
        setMsg(
          data.outcome === "loss"
            ? "House wins this chain."
            : `Banked $${data.banked?.toLocaleString?.() ?? ""}`,
        );
      }
      return;
    }
    setCurrent(data.nextCard);
    setRound(data.round);
    setMult(data.multiplier);
    setHistory((h) => [...h, data.nextCard]);
  }

  async function bank() {
    if (!gameId) return;
    const res = await fetch("/api/game/higher-lower/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, action: "bank" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "failed");
      return;
    }
    setGameId(null);
    setCurrent(null);
    setHistory([]);
    patchBalance(data.newBalance);
    setMsg(`Banked $${data.banked.toLocaleString()}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/lobby" className="text-sm text-flipz-cyan underline">
        ← Lobby
      </Link>
      <div className="mt-6 rounded-2xl border border-emerald-700/40 bg-emerald-950/40 p-8 shadow-inner">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-200/70">Current card</p>
            <p className="text-5xl font-bold text-white">
              {current ? label(current) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-200/70">Round / mult</p>
            <p className="text-2xl font-semibold text-flipz-cyan">
              {round} · {mult}x
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            disabled={!gameId}
            onClick={() => void guess("higher")}
            className="flex-1 rounded-xl bg-white/10 py-4 text-lg font-bold disabled:opacity-30"
          >
            HIGHER ↑
          </button>
          <button
            type="button"
            disabled={!gameId}
            onClick={() => void guess("lower")}
            className="flex-1 rounded-xl bg-white/10 py-4 text-lg font-bold disabled:opacity-30"
          >
            LOWER ↓
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!gameId || round === 0}
            onClick={() => void bank()}
            className="rounded-lg border border-flipz-pink px-4 py-2 text-sm text-flipz-pink disabled:opacity-30"
          >
            Bank winnings
          </button>
          <button
            type="button"
            disabled={!!gameId}
            onClick={() => void start()}
            className="rounded-lg bg-flipz-pink px-4 py-2 text-sm font-semibold text-black disabled:opacity-30"
          >
            {gameId ? "Finish chain to start new" : "Start table"}
          </button>
        </div>
        <label className="mt-6 block text-sm text-emerald-100/70">
          Bet amount
          <input
            type="number"
            disabled={!!gameId}
            min={MIN_BET}
            max={MAX_BET}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        {msg && <p className="mt-4 text-sm text-amber-200">{msg}</p>}
        <p className="mt-4 text-xs text-white/45">
          Each win multiplies the bank by 1.45×; the chain caps at 2.8×. Equal rank = push
          (free next card).
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/50">
          {history.map((c, i) => (
            <span key={i} className="rounded bg-black/30 px-2 py-1">
              {label(c)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
