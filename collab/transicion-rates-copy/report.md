# Report — transicion.php live EUR⇄VES rate widget + softened copy

**Branch:** `feat/transicion-rates-copy`

**Builder:** Codex

**Status:** user-directed follow-up committed on local `main`; José explicitly authorized direct
push on 2026-08-15 and deferred Claude's cross-review

## Files and purpose

- `transicion.php` — keeps the optional read-only `config` lookup and two status-gated EUR/VES
  rates, reorganizes the live page into José's requested cascade, and removes the expandable
  communiqué entirely.
- `collab/transicion-rates-copy/report.md` — records implementation evidence and handoff state.
- `collab/friction.md` — records the local PHP environment limitation encountered during checks.
- `collab/transicion-rates-copy/spec.md` — records José's post-merge copy/layout override and his
  later authorization to defer cross-review and push this follow-up directly to `main`.

No changes were made to `.htaccess`, `index.php`, `root.php`, `db-config.php`, or any build/tooling
surface. No React/TSX files or external assets were introduced.

## Checks actually run

- `php -l transicion.php` — passed on PHP 8.3.6.
- `git diff --check` — passed.
- Deterministic rendered-output harness with a stub `MYSQLI`/`mysqli_result`:
  - `status = 1` rendered `fee` as `2,650.00 Bs`, `ves2eur` as `2,700.50 Bs`, and
    `date_ves` as `Actualizado: 14/08/2026`.
  - `status = 0` omitted the entire `.rates` section while preserving the page shell.
  - missing `db-config.php` omitted the widget without a visible warning and preserved the page.
  - connection errors, a false query result, and a thrown query error each omitted the widget
    while preserving the page shell.
  - the harness asserted the exact hardcoded `SELECT fee, ves2eur, status, date_ves FROM config
    WHERE id = 1` query.
- Headless Chrome screenshots were visually inspected at 375 px, 768 px, and 1280 px widths;
  the two values stayed readable with no clipping or unexpected wrapping.
- The initial headless Chrome reduced-motion check confirmed the rate-arrow exception while the
  wordmark and bridge froze. José later superseded that behavior for the full landing; see the
  follow-up verification below.
- The resulting communiqué was checked for the prohibited partner terms, well-wish language,
  named App/company disclosures, and committed dates; none remain. The three official channels
  remain the existing number, `@supercambiosjvv`, and `supercambiosjvv.com`.
- Scope check confirmed the implementation adds no `.tsx` files and changes only
  `transicion.php` plus this task's `collab/` evidence.

## Deviations

None. The successful-data gate also requires numeric rate values and a valid `date_ves`; malformed
pricing data therefore hides the widget instead of publishing `0.00` or a fabricated update date.
This is the fail-closed interpretation of the spec's silent-degradation requirement.

## Assumptions and uncertainties

- `date_ves` continues to contain a MySQL-compatible datetime when rates are publishable, as it
  does in the existing admin flow.
- Local PHP lacks the `mysqli` extension, so the branch was not connected to a real local or
  production database. The rendered success and status gates were exercised with the deterministic
  stub described above; Hostinger connectivity remains part of José's live verification.
- José explicitly deferred the pricing cross-review for this deployment and authorized the direct
  push; Claude review is therefore not a deployment blocker for this handoff.

**Friction:** low — local PHP CLI lacks `mysqli`, so DB-open/status paths required an in-memory stub
harness instead of a real local MySQL render.

## Follow-up verification — 2026-08-14

José requested a new content cascade after the initial implementation landed as `ef2efdd`. The
follow-up removes the expandable communiqué and orders the rendered page as: brief ownership update
→ rates → contact-first instruction → unchanged WhatsApp number treatment → official channels/CTA
→ forward-looking JVV copy → bridge → stage-2 chevrons.

Checks run for the follow-up:

- `php -l transicion.php` and `git diff --check` — passed.
- Render harness asserted the exact section order, the formatted open-state rates/date, the unchanged
  `+34 624 44 26 73`, absence of `<details>`, presence of stage-2 geometry, and absence of the
  stage-3 tilde geometry.
- `status = 0` and missing-config renders omitted the rate section while preserving the number,
  channels, forward-looking message, bridge and teaser.
- Headless Chrome renders were visually inspected at 375 px, 768 px and 1280 px; no clipping,
  numeric overflow or broken content hierarchy was observed.
- Rate values keep the exact PHP `number_format(..., 2)` contract and now use monospaced tabular
  numerals to prevent width jitter.

## Motion follow-up — 2026-08-15

- Per José's follow-up, the page-level `prefers-reduced-motion: reduce` override was removed. Under
  reduced-motion emulation, the wordmark, bridge and rate swap now retain their normal loop
  animations, while the chevrons retain their existing one-time cascade.
- Headless Chrome with reduced motion actively emulated reported `wordmarkSuperLoop`, `build`,
  `rateForward`, `rateBack` and `frag` as the computed animation names.

## Review and deployment handoff

José explicitly deferred Claude's cross-review on 2026-08-15 and authorized Codex to push this
completed local `main` directly. Codex does not invoke Claude. The repository auto-deploys from
`main`, so the post-push live render is the deployment check for this handoff.
