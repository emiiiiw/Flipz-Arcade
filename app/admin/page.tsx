"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Invalid credentials");
      return;
    }
    router.push("/admin/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0b0f] px-4">
      <form
        onSubmit={(e) => void submit(e)}
        className="glass-panel w-full max-w-md rounded-2xl border border-gold/30 p-8"
      >
        <h1 className="text-2xl font-semibold text-gold">Flipz Admin</h1>
        <p className="mt-1 text-sm text-white/50">Economy control &amp; analytics</p>
        <label className="mt-6 block text-sm text-white/70">
          Username
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="mt-4 block text-sm text-white/70">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-gold to-amber-600 py-2.5 font-semibold text-black disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-xs text-white/40">
          Set ADMIN_USERNAME and ADMIN_PASSWORD in environment variables.
        </p>
      </form>
    </main>
  );
}
