# Restart pointer

Read `spec.md` in this folder first — it has the full decision record and exact next steps.

**One-line status (2026-08-23):** live at `https://jvv-desk-log.vercel.app`. Neon provisioned,
9/9 migrations applied, 661 clients imported, `DESK_PASSWORD` set in Production. Only José's
own end-to-end test against the real database is left. The earlier "Vercel project creation is
blocked" note was a false alarm — the project existed all along; the MCP just can't see projects
outside the "GreenNell and claude" team. See `spec.md` → "Deployment".

**Don't re-derive the economics model.** It went through three real correction rounds with José
after hands-on testing (see `spec.md` § Locked decisions, #4-#7) — `lib/pricing.ts` and
`lib/fifo.ts` in `log/` are heavily commented with the *why*, not just the *what*. Read those
before assuming anything needs redesigning.

**Local testing:** a throwaway Docker Postgres was used for manual verification across all three
rounds (container `jvv-log-test-db`, port 55432, password `test`, `DESK_PASSWORD=jvv2026`) — that
was local-only, not committed, and is not the real deployment.
