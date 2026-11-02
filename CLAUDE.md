# PichaiCrab

Ledger for a middleman importing crab from Vietnam and selling it in Thailand. One record = one import lot. Mobile-first, Thai UI.

## Communication
- Talk to the user in Thai only.
- Committing and pushing to `origin` (https://github.com/znookz/PichaiCrab.git) is pre-authorized.

## Stack
- Astro 7 (static pages + on-demand API routes) with `@astrojs/cloudflare`, deployed as a Cloudflare Worker.
- Cloudflare D1 (binding `DB`, SQLite). Migrations in `migrations/`.
- Vanilla TypeScript on the client. No UI framework. No new dependencies without the user's instruction.
- Access control is Cloudflare Access (dashboard config), not app code. Never add login screens.

## Commands
- `npm run db:migrate:local` once, then `npm run dev` (local D1 lives in `.wrangler/`, git-ignored).
- `npm run build` must pass before committing.
- `npm run db:migrate:remote`, `npm run deploy`: need `wrangler login` and a real `database_id` in `wrangler.jsonc`.

## Layout
- `src/pages/{index,dashboard,data}.astro`: static shells for the 3 tabs. `src/pages/api/lots/`: REST API (`prerender = false`).
- `src/scripts/*.ts`: per-page client logic (fetches `/api/lots`, renders DOM/SVG).
- `src/lib/lot.ts`: `calcLot` and validation, shared by client and server. `db.ts`: D1 access. `format.ts`, `charts.ts`, `api.ts`, `toast.ts`: helpers.
- `Crab Ledger app design/`: source design exported from Claude Design (`.dc.html` + its runtime `support.js`). Reference only; do not ship or edit.

## Domain rules
- Only inputs are stored (`lots` table). Derived values are always recomputed by `calcLot`; never persist them.
- Rates are VND per 1 THB; VND to THB is a division. `vnFee` and `thFee` are per kg.
- `net = crab - vnFee*kg`; `thbConv = crab / rate1`; `billed = thbConv + thFee*kg`; `transfer = net / rate2`; `profit = billed - transfer`.
- Profit breakdown (sums exactly to profit): `vnFee*kg / rate2` + `thFee*kg` + `crab/rate1 - crab/rate2`.
- Round only for display. Sanity case: crab 100,000,000, vnFee 3,000, kg 1,000, rate1 750, rate2 762, thFee 5 gives profit 11,036.75.
- Validation lives in `validateNumbers` and runs on both client and server. Keep them in sync by editing only that function.

## Conventions
- UI strings in Thai. Code comments and `console.error` messages in Japanese. Keep comments sparse.
- Colors, spacing and font sizes are CSS custom properties in `src/styles/global.css`; dark mode via `prefers-color-scheme`.
