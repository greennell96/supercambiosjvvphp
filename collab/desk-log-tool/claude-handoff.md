# Restart pointer

Read `spec.md` in this folder first — it has the full decision record and exact next steps.

**One-line status:** code is done, tested, and pushed to `origin/feat/desk-log-tool`. Not
deployed yet — blocked on José creating/connecting the Vercel project (this session's Vercel MCP
access can't see `supercambiosjvvphp`), then env vars + Postgres + migrate + import, all detailed
in `spec.md` → "Next steps."

**Don't re-derive the economics model.** It went through three real correction rounds with José
after hands-on testing (see `spec.md` § Locked decisions, #4-#7) — `lib/pricing.ts` and
`lib/fifo.ts` in `log/` are heavily commented with the *why*, not just the *what*. Read those
before assuming anything needs redesigning.

**Local testing:** a throwaway Docker Postgres was used for manual verification across all three
rounds (container `jvv-log-test-db`, port 55432, password `test`, `DESK_PASSWORD=jvv2026`) — that
was local-only, not committed, and is not the real deployment.
