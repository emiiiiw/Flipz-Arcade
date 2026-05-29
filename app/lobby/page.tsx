"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet } from "@/components/Wallet";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useSessionStore } from "@/store/session";
import { errorMessageFromBody, isSuccessBody, safeJson } from "@/lib/safeJson";

const games = [
  {
    href: "/game/coinflip",
    title: "Coin Flip",
    tag: "True 50-50",
    range: "$20k – $500k",
    blurb: "True 50-50 chance on every flip — cryptographically fair, server-verified.",
  },
  {
    href: "/game/higher-lower",
    title: "Higher / Lower",
    tag: "Card run",
    range: "$20k – $500k",
    blurb: "Read the deck, chain correct calls, and bank your run when you are ahead.",
  },
  {
    href: "/game/crash",
    title: "Crash",
    tag: "Live rounds",
    range: "$20k – $500k",
    blurb: "Provably fair timing. Cash out before the curve stops.",
  },
  {
    href: "/game/crossy",
    title: "Crossy",
    tag: "Skill",
    range: "$20k – $200k",
    blurb: "Get paid based on your skill — dodge traffic and clear lanes.",
  },
];

function LobbyInner() {
  const searchParams = useSearchParams();
  const routing = searchParams.get("routing");
  const setFromServer = useSessionStore((s) => s.setFromServer);
  const [depositOpen, setDepositOpen] = useState(false);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [depAmount, setDepAmount] = useState(20_000);
  const [depBusy, setDepBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/session");
    const data = await safeJson(res);
    console.log("session response status", res.status);
    console.log("session response body", data);
    if (
      isSuccessBody(data) &&
      data &&
      typeof data === "object" &&
      (data as Record<string, unknown>).authenticated === true
    ) {
      const d = data as Record<string, unknown>;
      setFromServer({
        sessionId: d.sessionId as string,
        displayName: d.displayName as string,
        balance: d.balance as number,
        totalDeposited: d.totalDeposited as number,
        totalWagered: d.totalWagered as number,
        totalWon: d.totalWon as number,
      });
    }
  }, [setFromServer]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!routing) return;
    void (async () => {
      const res = await fetch(
        `/api/auth/post-verify?routing=${encodeURIComponent(routing)}`,
      );
      const data = await safeJson(res);
      console.log("post-verify response status", res.status);
      console.log("post-verify response body", data);
      if (isSuccessBody(data)) await refresh();
    })();
  }, [routing, refresh]);

  async function doDeposit() {
    setDepBusy(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: depAmount }),
      });
      const data = await safeJson(res);
      console.log("deposit response status", res.status);
      console.log("deposit response body", data);
      if (!res.ok || !isSuccessBody(data)) {
        throw new Error(errorMessageFromBody(data, `Deposit failed (HTTP ${res.status})`));
      }
      const paymentLink = (data as Record<string, unknown>).paymentLink;
      if (typeof paymentLink !== "string") throw new Error("No payment link returned");
      window.open(paymentLink, "_blank", "noopener,noreferrer");
      setDepositOpen(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDepBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 pb-24 pt-8 md:px-10">
      <Wallet
        onDeposit={() => setDepositOpen(true)}
        onCashout={() => setCashoutOpen(true)}
      />
      <header className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-bold">
            <span className="bg-gradient-to-r from-flipz-pink to-flipz-cyan bg-clip-text text-transparent">
              Flipz Arcade
            </span>
          </h1>
          <p className="text-white/60">
            Server-verified games with transparent seeds — play fair, play loud.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/verify" className="text-flipz-cyan underline">
            Provably fair
          </Link>
          <Link href="/inventory" className="text-flipz-cyan underline">
            Inventory
          </Link>
          <Link href="/house-rules" className="text-flipz-cyan underline">
            House rules
          </Link>
        </nav>
        <ActivityFeed />
      </header>

      <section className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
        {games.map((g) => (
          <motion.div
            key={g.href}
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-white/10 bg-flipz-panel/70 p-6 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
                {g.tag}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/60">{g.blurb}</p>
            <p className="mt-3 text-xs text-white/40">{g.range}</p>
            <Link
              href={g.href}
              className="mt-4 inline-block rounded-lg bg-flipz-pink px-4 py-2 text-sm font-semibold text-black"
            >
              Play
            </Link>
          </motion.div>
        ))}
      </section>

      {cashoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-flipz-panel p-6">
            <h3 className="text-lg font-semibold">Cash out</h3>
            <p className="mt-3 text-sm text-white/80">
              Cashouts are not currently implemented, contact support for a site credit or
              rakeback
            </p>
            <button
              type="button"
              onClick={() => setCashoutOpen(false)}
              className="mt-6 w-full rounded-lg bg-flipz-cyan py-2.5 font-medium text-black"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {depositOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-flipz-panel p-6">
            <h3 className="text-lg font-semibold">Deposit</h3>
            <p className="mt-1 text-sm text-white/60">
              Min $20,000 · Max $500,000 — opens Fleeca checkout.
            </p>
            <input
              type="number"
              className="mt-4 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
              value={depAmount}
              min={20_000}
              max={500_000}
              onChange={(e) => setDepAmount(Number(e.target.value))}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDepositOpen(false)}
                className="flex-1 rounded-lg border border-white/20 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={depBusy}
                onClick={() => void doDeposit()}
                className="flex-1 rounded-lg bg-flipz-cyan py-2 font-medium text-black"
              >
                {depBusy ? "…" : "Open Fleeca"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white/60">Loading…</div>}>
      <LobbyInner />
    </Suspense>
  );
}
