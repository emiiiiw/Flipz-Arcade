import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  CASHOUT_FEE_FLAT,
  MIN_CASHOUT_GROSS,
  VERIFY_AMOUNT,
} from "@/lib/constants";

export default function HouseRulesPage() {
  return (
    <AppShell className="max-w-2xl">
      <Link href="/lobby" className="flipz-link">
        ← Lobby
      </Link>
      <h1 className="mt-6 text-3xl font-bold">
        <span className="flipz-gradient-text">Flipz Arcade — House Rules</span>
      </h1>
      <div className="flipz-glass-card mt-8 space-y-6 text-white/80">
        <section>
          <h2 className="text-xl font-semibold text-white">How games work</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Coin flip</strong> — True 50-50 chance on every flip using cryptographic
              randomness (not <code>Math.random</code>).
            </li>
            <li>
              <strong>Higher / Lower</strong> — Standard card comparisons; equal rank is a{" "}
              <strong>push</strong> (next card). Bank your run anytime.
            </li>
            <li>
              <strong>Crash</strong> — Shared rounds with a committed seed hash before flight.
              Cash out while the multiplier is climbing.
            </li>
            <li>
              <strong>Crossy</strong> — Get paid based on your skill. Lane layouts are derived
              from a committed seed before you move.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Provably fair</h2>
          <p className="mt-2">
            Crash publishes a <strong>SHA-256 hash</strong> of the seed before bets close;
            the seed is revealed when the round ends. Coin flip records seed + hash for
            audit. Crossy publishes lane layouts from the seed hash before you move. Use{" "}
            <Link href="/verify" className="flipz-link">
              /verify
            </Link>{" "}
            to recompute outcomes from published values.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Cash out</h2>
          <p className="mt-2">
            In-client cashouts are <strong>not available</strong> here. For a site credit or
            rakeback, <strong>contact support</strong>.
          </p>
          <p className="mt-2 text-sm text-white/55">
            A future build may expose automated withdrawals (planned: min gross{" "}
            <strong>${MIN_CASHOUT_GROSS.toLocaleString()}</strong>, flat fee{" "}
            <strong>${CASHOUT_FEE_FLAT.toLocaleString()}</strong>, net via Fleeca).
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Limits</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>Minimum bet: $20,000</li>
            <li>Maximum bet: $500,000 (Crossy max $200,000)</li>
            <li>
              Identity verification: <strong>${VERIFY_AMOUNT.toLocaleString()}</strong>{" "}
              (credited to your balance on success)
            </li>
            <li>
              Cash out: use support for credit / rakeback; automated route may be added
              later.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Fleeca</h2>
          <p className="mt-2">
            Deposits and verification go through GTA World Fleeca APIs when{" "}
            <code>FLEECA_API_KEY</code> is set. Without keys, the app runs in{" "}
            <strong>mock pay</strong> mode for local development only.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
