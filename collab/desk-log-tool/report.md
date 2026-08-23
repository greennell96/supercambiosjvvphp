# Desk log tool — deployment completion report

**Date:** 2026-08-23
**Branch:** `feat/desk-log-tool` (not merged)
**Scope of this pass:** finish the deployment. No application code was changed — only
provisioning, the one-time data load, and correcting three stale documents.

## Files touched

| File | Purpose |
|---|---|
| `collab/desk-log-tool/spec.md` | Replaced the wrong "Blocker: Vercel project creation" section with a "Deployment (resolved)" record; updated Current state. |
| `collab/desk-log-tool/claude-handoff.md` | Status line said "not deployed, blocked"; now says live, with the false-alarm noted. |
| `collab/friction.md` | The 2026-08-23 entry misdiagnosed the MCP gap as `create_git_project` silently failing. Rewritten to the real cause (team scoping). |

## What was actually wrong

Not what the handoff claimed. `jvv-desk-log` existed the whole time — correctly linked to the
repo, Root Directory `log`, building from `feat/desk-log-tool`, build green. The prior session
concluded "creation failed" because `list_projects` returned nothing, but that MCP is scoped to
the **"GreenNell and claude"** team and cannot see projects on José's personal account
(`supercambiosjvv-transicion` is invisible to it too, and that one demonstrably exists).

The real fault: no environment variables. `/login` served 200 while every other route returned a
bare `500`. That split is `proxy.ts` crashing — it passes `/login` through untouched, then calls
`getSessionSecret()`, which throws when neither `SESSION_SECRET` nor `DESK_PASSWORD` is set.

## Checks actually run

- Probed all routes by `curl` before and after: 500 on everything but `/login` → after José set
  `DESK_PASSWORD` + Neon, `307 → /login` on `/`, `/envios`, `/clientes`, `/compras`, `/ventas`,
  `/codigos`; `/login` 200 rendering the real app HTML.
- `npm run migrate` → 9/9 applied (unpooled Neon endpoint).
- `npm run import:clients` dry run → 661 clients, 1 internal row discarded. Then `--write`,
  same numbers.
- Queried the database directly: 9 tables + `_migrations` (9 rows); `clients` = 661 with
  phone/banks/DNI/date populated; `sendings`, `crypto_purchases`, `ves_sales`, `codigos` and both
  allocation tables all 0, as intended.

## Not verified

Everything behind the password. José holds the live `DESK_PASSWORD` and drives live testing, so
no authenticated flow has run against the Neon database — only against local Docker Postgres
during the three earlier correction rounds. Worth exercising, in rough order of money-risk:
creating a sending, logging a crypto purchase and a VES sale, then paying a sending both from the
pool and directly, and checking the resulting cost/profit numbers against expectation.

## Assumptions

- Used the **unpooled** Neon endpoint for migrations and the import; the app keeps the pooled one
  Vercel injected. Standard practice for DDL, and the two point at the same database.
- Left `SESSION_SECRET` unset — `lib/session.ts` falls back to `DESK_PASSWORD` by design.

## Operational follow-ups

- Migrations are **not** automatic on deploy. Any future `migrations/*.sql` needs `npm run migrate`
  run by hand against Neon.
- `log/.env.local` (gitignored) now holds the real Neon `DATABASE_URL` for re-runs. The
  `DESK_PASSWORD` in that file is a local placeholder, not the live value.
- `log/` carries an `.htaccess` that denies all, so it stays inert if this branch ever merges into
  the Hostinger document root. **`collab/` has no such guard** — if this branch merges to `main`
  while Hostinger is serving again, the dossier would be publicly reachable. Worth handling at
  merge time, not now.
- Optional: transfer `jvv-desk-log` into the "GreenNell and claude" team to give the Vercel MCP
  build logs, runtime errors and env visibility instead of black-box `curl` probes.

**Friction:** Vercel MCP is scoped to one team, so projects on the personal account 404 in
`list_projects` — making a project that exists look like it was never created, and costing this
task a full session of being wrongly blocked. Logged in `collab/friction.md` (2026-08-23).
