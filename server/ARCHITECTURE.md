# Flipz server-authoritative architecture

## Game engines (`/server/games`)

| Engine | Responsibility |
|--------|----------------|
| `coinflipEngine.ts` | Fair flip + tiered house edge (70% / 90% house win by wager) |
| `cardsEngine.ts` | Higher/Lower guesses + chain multipliers from economy DB |
| `crashEngine.ts` | Weighted crash distribution + cashout validation |
| `crossyEngine.ts` | Lane generation, advance anti-cheat, per-lane payouts |

Clients receive **sanitized** `clientPayload` only. Wagers, payouts, and balances are never taken from the client.

## Economy (`/server/economy`)

- `economy_settings` table — live JSON per `gameKey` (no redeploy)
- Admin UI: `/admin/dashboard`
- Defaults: `defaultConfigs.ts` · loader: `configLoader.ts` (5s cache)

## Security (`/server/security`)

- `nonce.ts` — single-use request nonces
- `rateLimit.ts` — per-session in-memory limits (plug Redis via `REDIS_URL` later)
- `audit.ts` — admin + suspicion scoring

## Ops

```bash
npx prisma db push
npm run db:seed
```

Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` in Vercel (do not commit passwords).
