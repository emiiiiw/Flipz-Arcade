"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessageFromBody, safeJson } from "@/lib/safeJson";

type FeedItem = {
  id: string;
  message: string;
  displayName: string;
  amount?: number | null;
  multiplier?: number | null;
  kind: string;
  at: string;
};

const ACTIVITY_URL = "/api/activity";

const LOCAL_FALLBACK: FeedItem[] = [
  {
    id: "local-1",
    displayName: "NeonFox",
    message: "NeonFox just won $2,400,000",
    amount: 2_400_000,
    multiplier: 3.2,
    kind: "filler",
    at: new Date().toISOString(),
  },
  {
    id: "local-2",
    displayName: "VaultKing",
    message: "VaultKing opened a Mythic Card",
    kind: "filler",
    at: new Date().toISOString(),
  },
  {
    id: "local-3",
    displayName: "StakeDreamer",
    message: "StakeDreamer hit 12.4x",
    multiplier: 12.4,
    kind: "filler",
    at: new Date().toISOString(),
  },
];

function normalizeItems(data: unknown): FeedItem[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const raw = o.items ?? o.feed;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is FeedItem =>
      row !== null &&
      typeof row === "object" &&
      typeof (row as FeedItem).id === "string" &&
      typeof (row as FeedItem).message === "string",
  );
}

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable" | "fallback">(
    "loading",
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(ACTIVITY_URL, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const data = await safeJson(res);

      if (!res.ok) {
        console.warn("[ActivityFeed] HTTP", res.status, data);
        setItems(LOCAL_FALLBACK);
        setStatus("unavailable");
        return;
      }

      const parsed = normalizeItems(data);
      if (parsed.length > 0) {
        setItems(parsed);
        setStatus("ok");
        return;
      }

      const success =
        data &&
        typeof data === "object" &&
        (data as Record<string, unknown>).success === true;

      if (success) {
        setItems([]);
        setStatus("ok");
        return;
      }

      setItems(LOCAL_FALLBACK);
      setStatus("fallback");
    } catch (e) {
      console.warn("[ActivityFeed] fetch failed:", e);
      setItems(LOCAL_FALLBACK);
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      void load();
    }, 12_000);
    return () => clearInterval(t);
  }, [load]);

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
            <span className="text-white/60">
              {item.message.replace(item.displayName, "").trim() || item.message}
            </span>
          </li>
        ))}
        {status === "loading" && items.length === 0 && (
          <li className="px-2 py-4 text-center text-white/40">Syncing feed…</li>
        )}
      </ul>
      {status === "unavailable" && (
        <p className="border-t border-white/10 px-3 py-2 text-center text-xs text-white/40">
          Live feed temporarily unavailable
        </p>
      )}
      {status === "fallback" && (
        <p className="border-t border-white/10 px-3 py-2 text-center text-xs text-white/35">
          Showing sample activity
        </p>
      )}
    </aside>
  );
}
