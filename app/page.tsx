"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { VERIFY_AMOUNT } from "@/lib/constants";

export default function LoginPage() {
  const [routing, setRouting] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"new" | "return">("new");

  async function verifyNew() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      window.open(data.paymentLink as string, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loginReturn() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      window.location.href = "/lobby";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-flipz-panel/80 p-8 neon-border"
      >
        <h1 className="text-center text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-flipz-pink to-flipz-cyan bg-clip-text text-transparent">
            Flipz Arcade
          </span>
        </h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Fair tables · Provably fair seeds · Fleeca-backed balances
        </p>

        <div className="mt-6 flex rounded-lg bg-black/30 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === "new" ? "bg-flipz-pink text-black" : "text-white/60"
            }`}
            onClick={() => setMode("new")}
          >
            New player
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === "return" ? "bg-flipz-cyan text-black" : "text-white/60"
            }`}
            onClick={() => setMode("return")}
          >
            Returning
          </button>
        </div>

        <label className="mt-6 block text-sm text-white/70">
          Fleeca routing number
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-flipz-cyan focus:ring-2"
            value={routing}
            onChange={(e) => setRouting(e.target.value)}
            placeholder="123456789"
          />
        </label>

        {mode === "new" ? (
          <>
            <button
              type="button"
              disabled={busy || !routing}
              onClick={verifyNew}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-flipz-pink to-flipz-cyan py-3 text-lg font-semibold text-black disabled:opacity-40"
            >
              {busy ? "Working…" : "Verify with Fleeca"}
            </button>
            <p className="mt-3 text-center text-xs text-white/50">
              You&apos;ll be charged ${VERIFY_AMOUNT.toLocaleString()} for identity
              verification. It&apos;s credited to your play balance in full.
            </p>
          </>
        ) : (
          <button
            type="button"
            disabled={busy || !routing}
            onClick={loginReturn}
            className="mt-6 w-full rounded-xl border border-flipz-cyan py-3 text-lg font-semibold text-flipz-cyan disabled:opacity-40"
          >
            {busy ? "Signing in…" : "Continue to lobby"}
          </button>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-rose-400">{error}</p>
        )}

        <Link
          href="/house-rules"
          className="mt-8 block text-center text-sm text-flipz-cyan underline"
        >
          House rules
        </Link>
      </motion.div>
    </main>
  );
}
