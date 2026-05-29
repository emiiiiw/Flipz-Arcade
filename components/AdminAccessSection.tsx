"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  showBackToArcade?: boolean;
};

export function AdminAccessSection({ className, showBackToArcade }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Invalid username or password");
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      setError("Could not reach server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "flipz-glass-card w-full max-w-md border-gold/30 p-6 shadow-neon-sm",
        className,
      )}
      aria-labelledby="admin-access-heading"
    >
      <h2 id="admin-access-heading" className="text-lg font-semibold text-gold">
        Staff login
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Economy control panel, live analytics, and game settings.
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-5 space-y-4">
        <label className="block text-sm text-white/70">
          Username
          <input
            className="flipz-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm text-white/70">
          Password
          <input
            type="password"
            className="flipz-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !username.trim() || !password}
          className="flipz-btn-primary w-full from-gold to-amber-600 bg-gradient-to-r disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Open admin panel"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        {showBackToArcade ? (
          <Link href="/" className="flipz-link text-xs">
            ← Back to arcade
          </Link>
        ) : (
          <Link href="/admin" className="flipz-link text-xs">
            Full-screen login
          </Link>
        )}
        <Link href="/admin/dashboard" className="text-white/40 hover:text-white/70">
          Already signed in?
        </Link>
      </div>
    </section>
  );
}
