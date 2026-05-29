import Link from "next/link";
import {
  CASHOUT_FEE_FLAT,
  CHAIN_PAYOUTS,
  COINFLIP_WIN_RETURN_MULT,
  CROSSY_WIN_MULT,
  MIN_CASHOUT_GROSS,
  VERIFY_AMOUNT,
} from "@/lib/constants";

export default function HouseRulesPage() {
  const hlMax = Math.max(...CHAIN_PAYOUTS);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/lobby" className="text-sm text-flipz-cyan underline">
        ← Lobby
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-flipz-pink">Flipz Arcade — House Rules</h1>
      <div className="mt-8 space-y-6 text-white/80">
        <section>
          <h2 className="text-xl font-semibold text-white">Payouts &amp; edge</h2>
          <p className="mt-2">
            Published multipliers below are what the server uses. Coin flip uses true{" "}
            <strong>50/50</strong> crypto RNG (no <code>Math.random</code>). Higher / Lower
            treats equal ranks as a <strong>push</strong> (next card). Crash and Crossy use
            committed seeds; see <Link href="/verify" className="text-flipz-cyan underline">/verify</Link>{" "}
            to audit.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/15 bg-black/30 text-white/90">
                  <th className="px-3 py-2 font-semibold">Game</th>
                  <th className="px-3 py-2 font-semibold">Payout / rule</th>
                  <th className="px-3 py-2 font-semibold">Approx. house edge</th>
                </tr>
              </thead>
              <tbody className="text-white/75">
                <tr className="border-b border-white/10">
                  <td className="px-3 py-2">Coin flip</td>
                  <td className="px-3 py-2">
                    Win returns <strong>{COINFLIP_WIN_RETURN_MULT}×</strong> wager (stake
                    included)
                  </td>
                  <td className="px-3 py-2">~30%</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="px-3 py-2">Higher / Lower</td>
                  <td className="px-3 py-2">
                    Each correct step <strong>×1.45</strong> on the running bank; chain caps
                    at <strong>{hlMax}×</strong> (bank tiers: {CHAIN_PAYOUTS.join(", ")}×)
                  </td>
                  <td className="px-3 py-2">Varies by stop</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="px-3 py-2">Crash</td>
                  <td className="px-3 py-2">
                    Crash point from <code className="text-flipz-pink">lib/games/crash.ts</code>{" "}
                    (mass <strong>0.30</strong> at instant 1.00×, multiplicative tail)
                  </td>
                  <td className="px-3 py-2">Structural ~30% at 1×</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Crossy</td>
                  <td className="px-3 py-2">
                    Top row win pays <strong>{CROSSY_WIN_MULT}×</strong> bet
                  </td>
                  <td className="px-3 py-2">Skill-dependent</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Provably fair</h2>
          <p className="mt-2">
            Crash publishes a <strong>SHA-256 hash</strong> of the seed before bets close;
            the seed is revealed when the round ends. You can recompute the crash point with
            the same formula shown on <Link href="/verify" className="text-flipz-cyan underline">/verify</Link>.
            Coin flip records seed + hash for audit. Crossy publishes lane layouts derived
            from the seed hash before you move.
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
    </main>
  );
}
