# Desk log tool — spec / decision record

**Branch:** `feat/desk-log-tool` (pushed to `origin`, based on `main`@`fc07cf8`, not merged)
**Scope:** `log/` — a new, self-contained Next.js + Postgres app, independent of the rest of
`repo:supercambiosjvvphp` (the legacy PHP and the `web/` static transition landing are untouched).

## Objective

José lost track of the Excel ("J V V 2026 NEW.xlsx") he used to log the desk's daily activity
and has live sendings coming in he hasn't recorded. This is a **deliberately temporary, throwaway**
internal tool to replace that Excel until the real App (`repo:cambiosjvv`) launches — not a
long-term product. Single user (José), shared password, no animations, correctness of the money
math matters far more than polish.

## Locked decisions (in order — later entries correct earlier ones)

1. **Scope, from the original Excel:** clients (name/phone/banks/DNI — no CxC/running balance),
   daily sendings log, crypto purchases, códigos, a small stats window. Confirmed via LUEF before
   any code was written.
2. **Hosting:** Hostinger's plan expired 2026-08-22 — no PHP/MySQL available anymore. New folder
   (`log/`) in this same repo, its **own separate Vercel project** (not the existing
   `supercambiosjvv-transicion` project, which is a deliberately backend-free static site serving
   the live public domain `supercambiosjvv.com` — mixing this PII-holding internal tool into that
   project was explicitly rejected). Postgres via Neon (Vercel Marketplace, free tier).
3. **Data import:** client roster (name, phone, banks, DNI/NIE) imported once from the `BD` sheet
   of the source Excel via `log/scripts/import-clients.ts`. No CxC/history import — starts fresh
   otherwise. Source file: `/home/greennell/kb/JVV/FILE ASSETS/J V V 2026 NEW.xlsx`.
4. **The FIFO/pool economics model (the core design), after real-world correction:**
   - **Tasa (EUR→VES)** is typed by José **per sending**, not auto-applied from a daily rate.
     `current_rates.tasa_eur_ves` is just a prefill suggestion.
   - **Precio derecha is not a rate — it's a second FIFO pool** (`ves_sales`), mirroring the
     existing USDT-cost pool (`crypto_purchases`). José logs actual Binance P2P sales
     (USDT sold / VES received); that accumulated VES balance is what funds payouts, in batches,
     later — not instantly per sending.
   - **Consequence:** a sending's `usdt_used`/`cost_eur`/`profit_eur` cannot be known at creation
     time — only once it's actually paid. `sendings` splits into two moments: creation (client-facing
     side only: amount, tasa, payout method → `amount_ves_to_pay`) and payment (funding side).
   - **Two ways to pay a pending sending:** from the pool (FIFO-draws VES, converts to USDT, then
     FIFO-draws the USDT-cost pool) or directly (José sells straight into the beneficiary's
     account, bypassing his own pool entirely — supplies `usdt_sold` directly, no fee).
   - **`lib/fifo.ts`** is one domain-neutral engine shared by both pools (`Lot { id, orderMs,
     price, remaining }`) — not two copies.
5. **Payout method, after a second correction:** not the client's bank (that solves the wrong
   problem). It's a fixed 3-value list describing **how José funds the payout**: `Provincial`
   (his own account, no fee) / `Otro` (interbank hop to a different bank, 0.3% fee — same rule
   as the old Excel's Pago Móvil/Otro) / `Directa` (sells straight to the client, no fee, doesn't
   force which "mark paid" action gets used later — that's still a separate, later choice).
   `/codigos` keeps its own, still-correct client-banks logic (`lib/banks.ts`) — unrelated,
   untouched.
6. **Crypto purchases input:** José enters `eur_paid` + `usdt_received`; price is derived
   server-side, not typed. Mirrors how `ves_sales` already stores raw inputs + derived price.
7. **Editable sendings:** a pending sending's `amount_eur`/`rate_tasa`/`payout_method` can be
   hand-corrected (recomputes `amount_ves_to_pay`); once paid, those three lock (the pool draws
   already happened against them). A separate `client_payment_note` field (free text — how the
   client paid **in Spain**, e.g. código/efectivo — unrelated to `payout_method`, never required
   at creation, never feeds a calculation) is editable regardless of status.
8. **Access:** single shared password (`DESK_PASSWORD` env var), HMAC-signed session cookie,
   no per-user accounts. José explicitly decided the app's own password screen is enough — no
   extra Vercel-level Deployment Protection needed for now.
9. **Fourth correction, after José's own live-data test (2026-08-23):** the pool-paid path was
   double-charging the USDT pool. José seeded opening balances (1973.89 USDT, 32350.37 Bs) via
   the app's own forms, logged one test sending paid from the pool, and watched `crypto_purchases`
   move even though his real Binance balance was already net of every sale he'd made. Root cause:
   `createVesSale` never drew `crypto_purchases` (a Binance sale registered no USDT cost at all),
   so `paySendingFromPool` drew it a beat later instead — the same USDT got costed at the wrong
   moment, not twice in total, but attributed to the wrong event. Fixed by moving cost recognition
   to the moment USDT actually leaves Binance: `createVesSale` now FIFO-draws `crypto_purchases`
   for `usdt_sold` and stores the result as `ves_sales.eur_cost` (migration 010,
   `sale_lot_allocations` audit table); `paySendingFromPool` now costs itself off that stored
   number and never touches `crypto_purchases`. `paySendingDirect` is unchanged. Also added: delete
   for all four entities (sendings/códigos/compras/ventas — none existed before), a sending always
   reversible via its allocation trail, a pool lot only deletable while nothing has drawn from it
   and it never absorbed a backorder itself (migration 011, `used_to_pay_backorders`) — otherwise
   refuses and says why. Implemented by two sequential Opus agents, reviewed and pushed by Claude;
   96/96 tests passing. The one pre-existing `ves_sales` row (opening balance, predates
   `eur_cost`) was hand-backfilled and the leftover "Syaned Cobis" test sending deleted via the
   real reversal code — see `log/scripts/cleanup-2026-08-23.ts` for the exact numbers.
10. **Client-paid tracking + código value + two-way link (2026-08-23), from José's own testing
    feedback.** `codigos` had no field for the actual bank code string — added (`codigos.code`,
    plain text). `sendings.status` only ever meant "did José pay the beneficiary"; there was no
    field for "did the client pay José" at all. Added `client_paid_at`/`client_payment_method`,
    independent of `status`, six methods in José's own words (CODIGO/EFECTIVO/CARREFOUR/BIZUM/
    A_CLIENTE/OTRO — OTRO's free text reuses `client_payment_note` rather than adding a second
    column). A código can link to a sending from either end, and the two directions behave
    differently on purpose: from `/codigos`, the open-sendings picker is scoped to that código's
    own client; from `/envios`, the unlinked-códigos picker shows every client's códigos with this
    sending's client sorted first (a código is sometimes issued under a relative's name). Deleting
    a linked código un-marks its sending back to unpaid-by-client; deleting a sending unlinks its
    código via `on delete set null` rather than blocking. Migration 012. 107/107 tests passing.

## Current state

- **Code:** committed and pushed to `origin/feat/desk-log-tool`. Not merged to `main` — that's
  José's call, per team convention, once he's tested it for real.
- **Tests:** 107/107 passing (`npm test` in `log/`), covering the FIFO engine (both pools),
  the fee rule, the two payment paths, the sale-time cost draw, the delete/reversal logic, the
  código↔envío link pickers, and the bank/Caixa-DNI helpers.
- **Verified locally** against a throwaway Docker Postgres + the real imported client list
  (661 clients) — all flows clicked through and working, including three live rounds of
  José's own manual testing and correction.
- **Deployed and live** at `https://jvv-desk-log.vercel.app` (2026-08-23). Database provisioned
  (Neon), all 9 migrations applied, 661 clients imported. See "Deployment" below.

## Deployment (resolved 2026-08-23)

The earlier "Vercel project creation failed" blocker was **wrong**. `create_git_project` had in
fact created `jvv-desk-log`, correctly linked to `greennell96/supercambiosjvvphp` with Root
Directory `log` and building from `feat/desk-log-tool`; the build succeeded. It was invisible to
that session's MCP only because the MCP is scoped to the Vercel team **"GreenNell and claude"**
(one project: `cambiosjvv`), while `jvv-desk-log` — like `supercambiosjvv-transicion` — lives on
José's personal account. `list_projects` returning nothing was a **visibility** limit, not a
creation failure. Probing the hostname directly (`curl`) is what settled it.

The real fault was missing environment variables. Symptom: `/login` served 200 and rendered
correctly, while every other route returned a bare `500 Internal Server Error`. That split is the
signature of `proxy.ts` crashing — it lets `/login` through untouched, then calls
`getSessionSecret()` for everything else, which throws when neither `SESSION_SECRET` nor
`DESK_PASSWORD` is set (`lib/session.ts`). A throw in the proxy layer 500s before any page renders.

Completed, in order:

1. José created the Neon Postgres store (Vercel Storage → Neon, free tier) and set `DESK_PASSWORD`
   in Production. Connecting the store triggered the redeploy that picked both up.
2. Verified from outside: `/` and all protected routes now `307 → /login` instead of 500.
3. `npm run migrate` — 9/9 migrations applied to the Neon database (via the **unpooled** endpoint).
4. `npm run import:clients -- --write` — 661 clients imported from the `BD` sheet
   (657 with phone, 503 with ≥1 bank, 9 with >1 bank, 238 with DNI/NIE, 661 with registration
   date; 1 internal bookkeeping row discarded, matching the dry run).
5. Verified directly against the database: 9 tables + `_migrations` (9 rows), `clients` = 661 with
   phone/banks/DNI/date populated, and all five ledger tables (`sendings`, `crypto_purchases`,
   `ves_sales`, `codigos`, plus the allocation tables) empty — a deliberately fresh start per
   decision #3.

Still open:

- **José's live test.** Everything past `/login` is behind the shared password, so it has not been
  exercised against the real database — only against the local Docker Postgres during the three
  correction rounds.
- `SESSION_SECRET` is not set; it falls back to `DESK_PASSWORD` by design (`lib/session.ts`).
  Setting it separately would mean sessions survive a password change. Optional.
- The project is not merged to `main`, and shouldn't be: `log/` exists only on
  `feat/desk-log-tool`, and Production Branch points there.
- **Optional:** transferring `jvv-desk-log` into the "GreenNell and claude" team would give the
  Vercel MCP visibility into its build logs, runtime errors and env config, instead of forcing
  black-box `curl` probes from outside.

## Environment notes for whoever picks this up

- No Vercel CLI and no Vercel token on this machine; env vars and storage must be done from the
  dashboard by José.
- `log/.env.local` (gitignored) now holds the real Neon `DATABASE_URL` (unpooled endpoint) for
  re-running migrations. Its `DESK_PASSWORD` there is a **local placeholder**, not the live one.
- Migrations are not automatic on deploy. Any new `migrations/*.sql` needs `npm run migrate` run
  by hand against the Neon database.

## Not in scope / explicitly deferred

CxC/running balances, discounts, multi-user accounts, animations, per-sending rate override at
creation, custom domain (deliberately using the default `*.vercel.app`, not attached to
`supercambiosjvv.com`).
