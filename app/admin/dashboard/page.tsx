"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Analytics = {
  totalDeposits: number;
  totalWithdrawals: number;
  netHouseProfit: number;
  profitByGame: Record<string, number>;
  rtpByGame: Record<string, number>;
  hourlyActiveUsers: number;
  averageWager: number;
  whaleCount: number;
  vipBreakdown: Record<string, number>;
};

const GAME_KEYS = ["global", "coinflip", "crash", "crossy", "higher_lower", "packs"];

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState("coinflip");
  const [editor, setEditor] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [aRes, eRes] = await Promise.all([
      fetch("/api/admin/analytics"),
      fetch("/api/admin/economy"),
    ]);
    if (aRes.status === 401 || eRes.status === 401) {
      window.location.href = "/admin";
      return;
    }
    if (aRes.ok) setAnalytics((await aRes.json()) as Analytics);
    if (eRes.ok) {
      const data = (await eRes.json()) as { settings: Record<string, unknown> };
      setSettings(data.settings);
      setEditor(JSON.stringify(data.settings[selected] ?? {}, null, 2));
    }
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEditor(JSON.stringify(settings[selected] ?? {}, null, 2));
  }, [selected, settings]);

  async function save() {
    setMsg(null);
    let config: unknown;
    try {
      config = JSON.parse(editor);
    } catch {
      setMsg("Invalid JSON");
      return;
    }
    const res = await fetch("/api/admin/economy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameKey: selected, config }),
    });
    if (!res.ok) {
      setMsg("Save failed");
      return;
    }
    setMsg("Live — applied without redeploy");
    void load();
  }

  return (
    <main className="min-h-screen bg-[#0a0b0f] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gold">Economy Control Panel</h1>
            <p className="text-sm text-white/50">RTP, volatility, jackpots, pause toggles</p>
          </div>
          <Link href="/lobby" className="text-sm text-neon-cyan underline">
            ← Arcade
          </Link>
        </header>

        {analytics && (
          <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Stat label="Deposits" value={`$${analytics.totalDeposits.toLocaleString()}`} />
            <Stat label="Withdrawals" value={`$${analytics.totalWithdrawals.toLocaleString()}`} />
            <Stat
              label="House profit"
              value={`$${analytics.netHouseProfit.toLocaleString()}`}
            />
            <Stat label="Active (1h)" value={String(analytics.hourlyActiveUsers)} />
            <Stat label="Avg wager" value={`$${analytics.averageWager.toLocaleString()}`} />
            <Stat label="Whales" value={String(analytics.whaleCount)} />
          </section>
        )}

        {analytics && (
          <section className="glass-panel mt-6 rounded-xl border border-white/10 p-4">
            <h2 className="text-lg font-medium text-gold">RTP &amp; profit by game</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-white/50">
                    <th className="py-2">Game</th>
                    <th className="py-2">RTP</th>
                    <th className="py-2">House profit</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(analytics.profitByGame).map((g) => (
                    <tr key={g} className="border-t border-white/10">
                      <td className="py-2">{g}</td>
                      <td className="py-2">
                        {((analytics.rtpByGame[g] ?? 0) * 100).toFixed(2)}%
                      </td>
                      <td className="py-2">
                        ${(analytics.profitByGame[g] ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="glass-panel mt-8 rounded-xl border border-gold/20 p-4">
          <h2 className="text-lg font-medium text-gold">Live economy config</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {GAME_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSelected(k)}
                className={`rounded-lg px-3 py-1 text-sm ${
                  selected === k
                    ? "bg-gold text-black"
                    : "border border-white/20 text-white/70"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <textarea
            className="mt-4 h-72 w-full rounded-lg border border-white/10 bg-black/60 p-3 font-mono text-xs text-emerald-200"
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void save()}
            className="mt-3 rounded-lg bg-neon-cyan px-4 py-2 font-semibold text-black"
          >
            Apply live
          </button>
          {msg && <p className="mt-2 text-sm text-amber-200">{msg}</p>}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-xl border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neon-cyan">{value}</p>
    </div>
  );
}
