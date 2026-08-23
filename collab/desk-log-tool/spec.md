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

## Current state

- **Code:** committed and pushed to `origin/feat/desk-log-tool`. Not merged to `main` — that's
  José's call, per team convention, once he's tested it for real.
- **Tests:** 72/72 passing (`npm test` in `log/`), covering the FIFO engine (both pools),
  the fee rule, the two payment paths, and the bank/Caixa-DNI helpers.
- **Verified locally** against a throwaway Docker Postgres + the real imported client list
  (661 clients) — all flows clicked through and working, including three live rounds of
  José's own manual testing and correction.
- **No live deployment yet.** See blocker below.

## Blocker: Vercel project creation

`create_git_project` (this session's Vercel MCP tool) reported creating a project named
`jvv-desk-log`, but it doesn't show up afterward in `list_projects` or
`get_git_deployment_context` — and that same context call shows this session's Vercel↔GitHub
connection only has visibility into the `cambiosjvv` repo, not `supercambiosjvvphp`. The GitHub
App behind the existing `supercambiosjvv-transicion` project (linked to `supercambiosjvvphp`) was
evidently installed through a different path than whatever this MCP session authenticates as.
**This needs José** — either grant that repo access to whatever installation the MCP tool uses,
or (faster) just create the project himself.

There is also no MCP tool in this session's toolset for setting environment variables or changing
a project's Production Branch after creation — the Vercel CLI isn't installed in this environment
either. Those steps will need the Vercel dashboard directly, or a session with the CLI installed
and authenticated.

## Next steps, in order, for whoever picks this up

1. **Create the Vercel project** (dashboard: New Project → Import `greennell96/supercambiosjvvphp`
   → before importing, set **Root Directory** to `log`). If a stray `jvv-desk-log` project already
   exists unlinked from an earlier attempt, check for it first — don't create a duplicate blindly.
2. **Set Production Branch** to `feat/desk-log-tool` (Settings → Git) — the code is not on `main`.
3. **Provision Postgres** — Neon via the Vercel Marketplace (Storage tab), free tier.
4. **Env vars** (Settings → Environment Variables): `DATABASE_URL` (from step 3),
   `DESK_PASSWORD` (pick something real — the local test used `jvv2026`, a throwaway, don't reuse
   it live).
5. **Migrate + import**, once, against the real database — from a machine with `DATABASE_URL`
   pointed at it: `npm run migrate` then `npm run import:clients -- --write` (inside `log/`).
6. **Deploy** (should trigger automatically once Production Branch + env vars are set — or a
   manual redeploy from the dashboard).
7. Hand José the resulting `*.vercel.app` URL + the real `DESK_PASSWORD`.

## Not in scope / explicitly deferred

CxC/running balances, discounts, multi-user accounts, animations, per-sending rate override at
creation, custom domain (deliberately using the default `*.vercel.app`, not attached to
`supercambiosjvv.com`).
