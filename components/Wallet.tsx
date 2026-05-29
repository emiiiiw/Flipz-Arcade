"use client";

import Link from "next/link";
import { useSessionStore } from "@/store/session";

type Props = {
  onDeposit: () => void;
  onCashout: () => void;
};

export function Wallet({ onDeposit, onCashout }: Props) {
  const { displayName, balance, totalDeposited, totalWagered, totalWon } =
    useSessionStore();

  const net = totalWon - totalWagered;

  return (
    <div className="fixed right-4 top-4 z-50 w-72 rounded-xl border border-white/10 bg-flipz-panel/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Balance</p>
          <p className="text-2xl font-semibold text-flipz-cyan">
            ${balance.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onDeposit}
            className="rounded-lg bg-flipz-pink px-3 py-1.5 text-sm font-medium text-black"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={onCashout}
            className="rounded-lg border border-flipz-cyan/60 px-2.5 py-1.5 text-xs font-semibold leading-snug text-flipz-cyan"
          >
            Cash out instantly
          </button>
        </div>
      </div>
      {displayName && (
        <p className="mt-2 truncate text-sm text-white/70">{displayName}</p>
      )}
      <details className="mt-3 text-xs text-white/60">
        <summary className="cursor-pointer select-none text-flipz-pink">
          Session stats
        </summary>
        <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
          <div className="flex justify-between">
            <span>Deposited</span>
            <span>${totalDeposited.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Wagered</span>
            <span>${totalWagered.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Won</span>
            <span>${totalWon.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-medium text-white">
            <span>Net P&amp;L</span>
            <span className={net >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {net >= 0 ? "+" : "-"}${Math.abs(net).toLocaleString()}
            </span>
          </div>
        </div>
      </details>
      <Link
        href="/house-rules"
        className="mt-3 block text-center text-xs text-flipz-cyan underline"
      >
        House rules
      </Link>
    </div>
  );
}
