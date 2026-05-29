"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSessionStore } from "@/store/session";
import { MIN_BET, MAX_BET } from "@/lib/constants";

const chips = [20_000, 50_000, 100_000, 250_000, 500_000];

export function CoinFlipGame() {
  const patchBalance = useSessionStore((s) => s.patchBalance);
  const [bet, setBet] = useState(20_000);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  async function flip() {
    setSpinning(true);
    setLast(null);
    try {
      const res = await fetch("/api/game/coinflip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: bet, pick }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      await new Promise((r) => setTimeout(r, 1200));
      setLast(`${data.result.toUpperCase()} — ${data.outcome}`);
      patchBalance(data.newBalance);
    } catch (e) {
      setLast((e as Error).message);
    } finally {
      setSpinning(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-10">
      <Link href="/lobby" className="self-start text-sm text-flipz-cyan underline">
        ← Lobby
      </Link>
      <motion.div
        animate={{ rotateY: spinning ? 720 : 0 }}
        transition={{ duration: 1.2 }}
        className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-flipz-cyan bg-gradient-to-br from-flipz-pink/40 to-flipz-cyan/30 text-4xl font-bold shadow-lg"
      >
        🪙
      </motion.div>
      <div className="flex gap-4">
        {(["heads", "tails"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPick(s)}
            className={`rounded-xl px-6 py-3 font-semibold capitalize ${
              pick === s
                ? "bg-flipz-pink text-black"
                : "border border-white/20 text-white/80"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="w-full max-w-md">
        <label className="text-sm text-white/60">
          Bet (${MIN_BET.toLocaleString()} – ${MAX_BET.toLocaleString()})
        </label>
        <input
          type="range"
          min={MIN_BET}
          max={MAX_BET}
          step={1000}
          value={bet}
          onChange={(e) => setBet(Number(e.target.value))}
          className="mt-2 w-full"
        />
        <p className="text-center text-xl text-flipz-cyan">${bet.toLocaleString()}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setBet(c)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs"
            >
              ${(c / 1000).toFixed(0)}k
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        disabled={spinning}
        onClick={() => void flip()}
        className="rounded-xl bg-gradient-to-r from-flipz-pink to-flipz-cyan px-10 py-3 text-lg font-bold text-black disabled:opacity-40"
      >
        {spinning ? "Flipping…" : "Flip"}
      </button>
      {last && <p className="text-center text-lg text-white">{last}</p>}
      <p className="text-center text-xs text-white/50">
        True 50-50 chance on every flip — outcomes are server-verified with{" "}
        <code>crypto</code>.
      </p>
    </div>
  );
}
