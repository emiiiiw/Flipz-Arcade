"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AdminAccessSection } from "@/components/AdminAccessSection";
import { AppShell } from "@/components/AppShell";
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
    <AppShell className="max-w-5xl pb-28">
      <Wallet
        onDeposit={() => setDepositOpen(true)}
        onCashout={() => setCashoutOpen(true)}
      />
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">
              <span className="flipz-gradient-text">Flipz Arcade</span>
            </h1>
            <p className="mt-2 max-w-xl text-white/60">
              Server-verified games with transparent seeds — play fair, play loud.
            </p>
          </div>
          <nav className="flex flex-wrap gap-4">
            <Link href="/verify" className="flipz-link">
              Provably fair
            </Link>
            <Link href="/inventory" className="flipz-link">
              Inventory
            </Link>
            <Link href="/house-rules" className="flipz-link">
              House rules
            </Link>
          </nav>
        </div>
        <ActivityFeed />
      </header>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {games.map((g) => (
          <motion.article
            key={g.href}
            whileHover={{ y: -4 }}
            className="flipz-glass-card transition hover:border-flipz-cyan/30"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <span className="rounded-full border border-flipz-cyan/30 bg-flipz-cyan/10 px-3 py-1 text-xs font-medium text-flipz-cyan">
                {g.tag}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/65">{g.blurb}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-white/40">{g.range}</p>
            <Link href={g.href} className="flipz-btn-primary mt-5 px-5 py-2">
              Play
            </Link>
          </motion.article>
        ))}
      </section>

      <section className="mt-16 border-t border-white/10 pt-12">
        <div className="mx-auto max-w-md">
          <AdminAccessSection />
        </div>
      </section>

      {cashoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flipz-glass-card w-full max-w-md">
            <h3 className="text-lg font-semibold">Cash out</h3>
            <p className="mt-3 text-sm text-white/80">
              Cashouts are not currently implemented, contact support for a site credit or
              rakeback
            </p>
            <button
              type="button"
              onClick={() => setCashoutOpen(false)}
              className="flipz-btn-primary mt-6 w-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {depositOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flipz-glass-card w-full max-w-sm">
            <h3 className="text-lg font-semibold">Deposit</h3>
            <p className="mt-1 text-sm text-white/60">
              Min $20,000 · Max $500,000 — opens Fleeca checkout.
            </p>
            <input
              type="number"
              className="flipz-input mt-4"
              value={depAmount}
              min={20_000}
              max={500_000}
              onChange={(e) => setDepAmount(Number(e.target.value))}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDepositOpen(false)}
                className="flipz-btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={depBusy}
                onClick={() => void doDeposit()}
                className="flipz-btn-primary flex-1 py-2"
              >
                {depBusy ? "…" : "Open Fleeca"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <AppShell centered>
          <p className="text-white/60">Loading lobby…</p>
        </AppShell>
      }
    >
      <LobbyInner />
    </Suspense>
  );
}
