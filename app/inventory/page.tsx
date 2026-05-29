"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  serialNumber: number;
  isHolographic: boolean;
  card: { name: string; rarity: string; slug: string };
};

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = (await res.json()) as { items: Item[] };
        setItems(data.items);
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/lobby" className="text-sm text-flipz-cyan underline">
        ← Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-gold">Card inventory</h1>
      <p className="mt-2 text-sm text-white/60">Trading-ready serials · holo variants</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="glass-panel rounded-xl border border-white/10 p-4"
          >
            <p className="font-semibold text-white">{item.card.name}</p>
            <p className="text-xs uppercase tracking-wide text-gold">{item.card.rarity}</p>
            <p className="mt-2 text-sm text-white/50">
              #{item.serialNumber}
              {item.isHolographic ? " · HOLO" : ""}
            </p>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="mt-8 text-white/40">Open packs from the lobby to collect cards.</p>
      )}
    </main>
  );
}
