"use client";

import { useEffect, useState } from "react";

type FeedItem = {
  id: string;
  message: string;
  displayName: string;
  amount?: number | null;
  multiplier?: number | null;
  kind: string;
  at: string;
};

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch("/api/activity");
      if (!res.ok) return;
      const data = (await res.json()) as { feed: FeedItem[] };
      if (alive) setItems(data.feed);
    };
    void load();
    const t = setInterval(() => void load(), 12_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <aside className="glass-panel w-full max-w-sm overflow-hidden rounded-xl border border-gold/20">
      <div className="border-b border-white/10 bg-black/40 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Live activity</p>
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto p-2 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg px-2 py-1.5 text-white/80 transition hover:bg-white/5"
          >
            <span className="text-neon-cyan">{item.displayName}</span>{" "}
            <span className="text-white/60">{item.message.replace(item.displayName, "").trim()}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-2 py-4 text-center text-white/40">Syncing feed…</li>
        )}
      </ul>
    </aside>
  );
}
