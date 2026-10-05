# OLX Business Admin

Ops console for the OLX Business member app (`../olx-business`). **No database yet** — data lives in browser `localStorage` (`lib/store.ts`). Replace that file with API calls when you connect Postgres/Supabase/Prisma.

## Run

```bash
cd olx-business-admin
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

| | |
|---|---|
| Username | `admin` |
| Password | `olx2026` |

Member app stays on port 3000.

## What the client can do alone

- Dashboard totals and large-withdraw alerts
- Users: search, freeze/unfreeze, ban, credit/debit invest or brokerage with reason, reset password queues
- Recharges: approve (credits invest) / reject
- Withdrawals: approve / reject / mark paid + CSV
- Transfers history
- VIP plans: edit range, income, days, rebate, hashpower, enable/disable
- Team commission % LEV 1–3
- Coin deposit addresses + min amounts
- CMS: about, agreement, privacy, FAQ, support, app
- Settings: flags, fees, daily cap, maintenance, Telegram
- Commands: commission recalc, expire dry-run, yield batch, CSV exports
- Audit log of admin actions

No impersonation. No wipe-database button.

## Later: database

1. Add Prisma/Supabase in this folder.
2. Keep the same screen payloads.
3. Swap `getStore` / `patchStore` in `lib/store.ts` for `fetch('/api/...')`.
4. Hash passwords on the server. Put `DATABASE_URL` in `.env` only.
