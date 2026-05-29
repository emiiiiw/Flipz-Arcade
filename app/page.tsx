"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { VERIFY_AMOUNT } from "@/lib/constants";
import { errorMessageFromBody, isSuccessBody, safeJson } from "@/lib/safeJson";

export default function LoginPage() {
  const [routing, setRouting] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"new" | "return">("new");

  async function lookupRouting(): Promise<{ ok: boolean; message?: string }> {
    const res = await fetch("/api/fleeca/lookup-routing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routingNumber: routing.trim() }),
    });
    const data = await safeJson(res);
    console.log("lookup-routing response status", res.status);
    console.log("lookup-routing response body", data);

    if (!res.ok || !isSuccessBody(data)) {
      return {
        ok: false,
        message: errorMessageFromBody(data, `Routing lookup failed (HTTP ${res.status})`),
      };
    }
    return { ok: true };
  }

  async function verifyNew() {
    setBusy(true);
    setError(null);
    try {
      const lookup = await lookupRouting();
      if (!lookup.ok) {
        setError(lookup.message ?? "Invalid routing number");
        return;
      }

      const res = await fetch("/api/auth/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routingNumber: routing.trim() }),
      });
      const data = await safeJson(res);
      console.log("verify-payment response status", res.status);
      console.log("verify-payment response body", data);

      if (!res.ok || !isSuccessBody(data)) {
        throw new Error(
          errorMessageFromBody(data, `Verification failed (HTTP ${res.status})`),
        );
      }

      const paymentLink = (data as Record<string, unknown>).paymentLink;
      if (typeof paymentLink !== "string" || !paymentLink) {
        throw new Error("No payment link returned from server");
      }

      window.open(paymentLink, "_blank", "noopener,noreferrer");
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
      const lookup = await lookupRouting();
      if (!lookup.ok) {
        setError(lookup.message ?? "Invalid routing number");
        return;
      }

      const res = await fetch("/api/auth/returning-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routingNumber: routing.trim() }),
      });
      const data = await safeJson(res);
      console.log("login response status", res.status);
      console.log("login response body", data);

      if (!isSuccessBody(data)) {
        throw new Error(
          errorMessageFromBody(data, `Sign-in failed (HTTP ${res.status})`),
        );
      }

      window.location.href = "/lobby";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell centered>
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flipz-glass-card neon-border w-full max-w-md p-8"
      >
        <h1 className="text-center text-4xl font-bold tracking-tight">
          <span className="flipz-gradient-text">Flipz Arcade</span>
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
            className="flipz-input"
            value={routing}
            onChange={(e) => setRouting(e.target.value)}
            placeholder="123456789"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>

        {mode === "new" ? (
          <>
            <button
              type="button"
              disabled={busy || !routing.trim()}
              onClick={() => void verifyNew()}
              className="flipz-btn-primary mt-6 w-full py-3 text-lg"
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
            disabled={busy || !routing.trim()}
            onClick={() => void loginReturn()}
            className="flipz-btn-secondary mt-6 w-full py-3 text-lg"
          >
            {busy ? "Signing in…" : "Continue to lobby"}
          </button>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-rose-400">{error}</p>
        )}

        <Link href="/house-rules" className="flipz-link mt-8 block text-center">
          House rules
        </Link>
      </motion.main>
    </AppShell>
  );
}
