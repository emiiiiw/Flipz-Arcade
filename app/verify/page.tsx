"use client";

import { useState } from "react";
import Link from "next/link";

export default function VerifyPage() {
  const [game, setGame] = useState("crash");
  const [seed, setSeed] = useState("");
  const [roundId, setRoundId] = useState("");
  const [seedHash, setSeedHash] = useState("");
  const [lane, setLane] = useState(0);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function run() {
    let payload: Record<string, unknown>;
    if (game === "crash") {
      payload = { game: "crash", seed, roundId };
    } else if (game === "coinflip") {
      payload = { game: "coinflip", seed, seedHash };
    } else {
      payload = { game: "crossy", seed, lane };
    }
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setResult((await res.json()) as Record<string, unknown>);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/lobby" className="text-sm text-flipz-cyan underline">
        ← Lobby
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-flipz-cyan">Provably fair verifier</h1>
      <p className="mt-2 text-sm text-white/60">
        Paste values Flipz showed after a round. Crash:{" "}
        <code className="text-flipz-pink">HMAC_SHA256(seed, roundId)</code> → uint →
        formula in <code className="text-flipz-pink">lib/games/crash.ts</code>.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block text-sm">
          Game
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
            value={game}
            onChange={(e) => setGame(e.target.value)}
          >
            <option value="crash">Crash</option>
            <option value="coinflip">Coin flip (hash check)</option>
            <option value="crossy">Crossy lane</option>
          </select>
        </label>
        <label className="block text-sm">
          Seed (hex)
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs"
            rows={3}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
        </label>
        {game === "crash" && (
          <label className="block text-sm">
            Round ID
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
            />
          </label>
        )}
        {game === "coinflip" && (
          <label className="block text-sm">
            Seed hash (SHA-256 hex)
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
              value={seedHash}
              onChange={(e) => setSeedHash(e.target.value)}
            />
          </label>
        )}
        {game === "crossy" && (
          <label className="block text-sm">
            Lane index (0–11)
            <input
              type="number"
              min={0}
              max={11}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
              value={lane}
              onChange={(e) => setLane(Number(e.target.value))}
            />
          </label>
        )}
        <button
          type="button"
          onClick={() => void run()}
          className="rounded-lg bg-flipz-pink px-4 py-2 font-semibold text-black"
        >
          Verify
        </button>
      </div>
      {result && (
        <pre className="mt-8 overflow-x-auto rounded-xl bg-black/50 p-4 text-xs text-emerald-200">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
