# Economy simulation modules

Standalone reference implementation for the virtual economy stack.

| File | Role |
|------|------|
| `EconomyManager.js` | Inverse-scaling reward-event probability |
| `UserAccess.cs` | Premium withdrawal gate + $20,000 activation fee |
| `DashboardUI.css` | Luxury dark dashboard styling |
| `Index.html` | Landing layout, stats, Plinko scaffold, headlines |

## Run probability tests

```bash
node economy-sim/EconomyManager.test.mjs
```

## Preview dashboard

Open `economy-sim/Index.html` in a browser (same folder as `DashboardUI.css`).

## Integrate with Flipz (TypeScript)

```ts
import { resolveRewardEvent } from "../economy-sim/EconomyManager.js";

const won = resolveRewardEvent(betAmount);
```

For withdrawals, mirror `UserAccess.cs` in `app/api/cashout/route.ts` using a session `isVerified` flag and `/api/auth/verify-payment` for activation.
