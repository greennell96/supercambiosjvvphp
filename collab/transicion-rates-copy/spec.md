# Spec — transicion.php: live EUR⇄VES rate widget + softened copy

**Branch:** `feat/transicion-rates-copy`
**Author:** Claude (spec) · **Builder:** Codex
**Scope file:** `transicion.php` ONLY. Do not touch `.htaccess`, `index.php`, `root.php`,
`db-config.php`, or any other page. The full-site rewrite block stays in place — this task
does not reopen the calculator, only adds a small live element to the brand-hold landing.

**Sensitivity:** counts as "pricing" under the shared team rule (money math/pricing/rail/etc.
require focused checks + cross-review before José merges), even though this is read-only
display with no write path. Claude will cross-review the diff once Codex's `report.md` lands,
before this goes to José. Note that in `report.md`'s Friction field either way.

---

## 1. Objective

Two independent additions to the brand-hold landing (`transicion.php`), which is currently
the only public surface at `supercambiosjvv.com` (everything else is blocked by the
`.htaccess` rewrite; that stays true after this ships):

1. A small **live rate widget** showing today's EUR→VES and VES→EUR rates, sourced from the
   same `config` table the real site/admin already use — no new data entry, no new admin UI.
2. **Softened copy** in the long communiqué (`<details>` block): shorter, strictly
   professional, and with every reference to the ex-partner removed (not just her name —
   the existing "antigua socia" / well-wish line goes too).

Both are still under the existing brand-hold doctrine: no date promised, no mention of
Belmoney/the App/Many Bridges SL anywhere on this page. This is still `$ETAPA`/`$RECUPERADO`
territory, not the relaunch.

---

## 2. Context you need (already verified, don't re-derive)

**Where the rate data lives** — single-row table `config` (`WHERE id = 1`), read via
`root.php`'s `$db` (mysqli). Columns that matter here:
- `fee` — EUR→VES rate. Displayed on `index.php` directly as "1 € = `fee` Bs", formatted with
  `number_format($fee, 2)`. No locale override — mirror that exact formatting, don't invent
  Spanish thousands/decimal separators that don't exist elsewhere in this codebase.
- `ves2eur` — VES→EUR rate. **Important, non-obvious:** despite the admin form's placeholder
  text suggesting a small decimal (`0,022`), the real runtime value is the same order of
  magnitude as `fee` (index.php's own fallback default is `2650.00` for both). `index.php`
  displays `ves2eur` **directly**, the same "1 € = X Bs" style as `fee` — it only computes
  `1 / ves2eur` internally for the actual amount math, never for display. **Mirror the direct
  display, not the placeholder's implied decimal.** This is an existing quirk in the codebase,
  not something to fix here.
- `status` — 0/1 service on/off switch. `index.php` shows `-` instead of a rate when `status
  == 0`. Reuse this exact gate: if `status != 1`, do not show numeric rates in the new widget
  either (fall back to the no-DB/closed placeholder described in §4).
- `date_ves` — datetime of last update. Use it for a simple "Actualizado: …" label. Do **not**
  port `index.php`'s 3-hour staleness countdown/JS — that's a bigger piece of business logic
  than this widget needs; a static last-updated line is enough. If José wants the staleness
  check later, that's a follow-up, not this task.

**Why this isn't a copy-paste of `root.php`:** `transicion.php`'s existing top-of-file comment
is explicit — *"No DB, no root.php: this page must render even if MySQL is down."* Don't
`INCLUDE('root.php')` wholesale: it also runs unconditional `ALTER TABLE`/`CREATE TABLE IF NOT
EXISTS` migration queries and `SESSION_START()` as side effects on every page load, which this
static landing page has no reason to trigger. Instead, open a **narrow, local, read-only**
connection scoped to this file:
- Same config-path resolution `root.php` uses (`dirname($_SERVER['DOCUMENT_ROOT']) .
  '/db-config.php'` on Hostinger, `__DIR__ . '/db-config.php'` locally).
- Wrap the `new MYSQLI(...)` in the same try/catch-to-null pattern `root.php` already uses.
- One `SELECT fee, ves2eur, status, date_ves FROM config WHERE id = 1` — hardcoded `id`, no
  request input anywhere near this query, so the codebase's known "no prepared statements"
  gotcha doesn't apply here (nothing to inject).
- **If the connection or query fails for any reason: do not render the rate widget section at
  all.** No fatal error, no warning output, no broken layout — the rest of the page (identity,
  teaser, channels, CTA) must render exactly as it does today with MySQL down. This preserves
  the file's original resilience guarantee; only the new widget is allowed to degrade.
- Update the top-of-file comment block to reflect the new reality (e.g. "no required DB — the
  optional rate widget below degrades silently if MySQL is unreachable").

**Two rates only, not four.** The original `index.php` calculator has four corridors
(EUR↔Bs, USD↔EUR). This widget shows **only EUR→VES and VES→EUR** — matches José's current
"keep it closed but with amendments" scope, and the USD legs are cash-only/Valencia-specific
edge cases that don't belong on a teaser.

---

## 3. The rate widget

Placement: a new section between the lead/status paragraphs and the `.work` bridge
illustration (i.e. right after the existing `<?php if ($RECUPERADO): ?> ... <?php endif; ?>`
paragraph block, before `<figure class="work">`). Rationale: concrete proof-of-life (real
numbers) before the more abstract "something's coming" motifs — but this is a suggestion, not
a hard requirement; if it reads better elsewhere in the sheet, fine, just keep it inside
`<main class="sheet">` and don't reorder the identity/CTA/channels blocks around it.

Content, gated on `$status == 1` and a successful query:
- Label each rate with direction, e.g. "EUR → Bs" / "Bs → EUR", value `number_format($rate,
  2)`, using the existing CSS custom properties already defined in `:root` (`--green`,
  `--green-mid`, `--accent`, `--paper`, `--rule`) — don't introduce new colors.
- A small "Actualizado: {date_ves formatted like d/m/Y}" line.
- If `status != 1` (or DB unreachable): omit the whole section, no placeholder text needed —
  simplest correct behavior, and consistent with how `index.php` treats `status == 0` (shows
  `-`, i.e. absence of a real number) rather than inventing new "closed" copy.

**Animation — inline SVG/CSS only, no `.tsx`.** José asked about a `.tsx` component; this repo
has no build step (flat PHP, `repo root = public_html root`, Hostinger auto-deploy on push) —
introducing React/JSX tooling for one widget is out of proportion for a feature explicitly
scoped as temporary, and this page in particular is designed to render with zero external
requests. Use the same technique already proven in this file (see `.teaser .frag` fade-ins and
`.work .seg` build animation): inline `<svg>` + CSS `@keyframes`, no extra asset files, no JS
framework. Something small and on-brand — e.g. a looping ⇄ swap or pulse between the two rate
values — is enough; exact motif is Codex's call within the existing visual language (the
bridge/chevron motifs already established — don't clash with them).

**Explicit reduced-motion exception, scoped to this element only:** every other animation in
this file respects `@media (prefers-reduced-motion: reduce)` (see the block at the bottom of
the `<style>`). José wants this new widget's animation to keep looping regardless — add it to
a *new* rule, do **not** add it to the existing reduced-motion block, and leave a one-line
comment noting this is a deliberate, scoped exception (matches this file's existing habit of
explaining non-obvious choices inline) so a future edit doesn't "fix" it back to respecting the
preference by accident.

---

## 4. Softened copy

**Leave the main lead/status paragraphs as they are** (last touched in commit `4edddfe` —
narrowed "operations paused" to public/automatic only, added the known-client carve-out).
They already do exactly what José asked for here: channels, what's-coming, no María. No
further edit needed there.

**Rewrite the `<details>` communiqué block** (`<summary>Leer el comunicado oficial
completo</summary>` and everything inside `.body`). Cut the founding-story paragraph and the
well-wish line entirely — the target is short, professional, three things only: the ownership
change (one subtle sentence, no name, no "antigua socia," no "le deseo éxito"), what's coming,
channels. Proposed text (Codex may polish phrasing, but must preserve every constraint listed
after it):

```
<p>Familia JVV, un mensaje breve y directo.</p>

<p>Lo que por años fue un proyecto de dos, hoy continúa bajo una sola dirección — la mía.
Estamos renovando JVV por completo: nueva estructura, nuevas herramientas y una experiencia
mucho mejor, mientras termino ese proceso.</p>

<p>Nuestros únicos canales oficiales siguen siendo este número, nuestro Instagram
@supercambiosjvv y supercambiosjvv.com. Iré mostrando avances por aquí a medida que estén
listos.</p>

<p>Gracias por la confianza de todos estos años.</p>
```

Keep the existing `<div class="sign">` block (José — Super Cambios JVV) as-is below it.

**Hard constraints on this text, not negotiable by Codex:**
- No reference to the ex-partner in any form — not her name (already absent), not "socia,"
  "antigua socia," "ex-socia," or any paraphrase beyond the single neutral "proyecto de dos →
  una sola dirección" sentence above. No well-wish line.
- No committed date, anywhere.
- No mention of Belmoney, "la App," or Many Bridges SL by name — matches the standing
  disclosure-ceiling rule for this whole gap window.
- Channels list must stay accurate: the WhatsApp number already rendered elsewhere on the
  page, Instagram `@supercambiosjvv`, `supercambiosjvv.com`. Don't add or drop a channel.

---

## 5. Acceptance criteria

- [ ] `.htaccess`, `index.php`, `root.php`, `db-config.php` untouched — diff is `transicion.php`
      (+ this `collab/` folder) only.
- [ ] With DB reachable and `config.status = 1`: widget shows `fee` and `ves2eur` formatted
      exactly like `index.php` does (`number_format($x, 2)`, no fabricated separators), plus a
      last-updated date from `date_ves`.
- [ ] With DB reachable and `config.status != 1`: widget section does not render; rest of page
      unaffected.
- [ ] With DB unreachable (test by pointing at a bad host/port, or temporarily renaming
      `db-config.php` locally — do not touch the real credentials file): page still renders
      fully, no PHP fatal/warning visible in output, widget section simply absent.
- [ ] Rate widget animation loops continuously under `prefers-reduced-motion: reduce`
      (verify via devtools emulation); every other animation on the page still freezes as
      before under that same setting.
- [ ] No `.tsx`/React/build-step files introduced anywhere in the repo.
- [ ] Communiqué block matches §4's constraints (grep the diff for "socia," "éxito," any date
      string, "Belmoney," "App," "Many Bridges" — none should appear).
- [ ] Manual check only — this repo has no test suite/CI; note in `report.md` exactly what was
      manually verified (per this checklist) since that's the only verification that exists.

---

## 6. Commit / report

One commit (or a small tightly-scoped stack) on `feat/transicion-rates-copy`, pushed to
origin. Write `collab/transicion-rates-copy/report.md` per the standard format (files/purpose,
checks actually run, deviations from this spec with reasoning, assumptions, Friction field —
`none` if nothing came up). Do not merge or push to `main` — Claude cross-reviews first
(Sensitivity note above), then José tests live and merges.

---

## 7. José follow-up — 2026-08-14 (supersedes conflicting copy/layout instructions)

- The initial implementation landed on `main` as `ef2efdd`.
- Remove the expandable “Leer el comunicado oficial completo” block entirely.
- Reorder the visible page as a cascade: brief neutral explanation of the ownership change → live
  rates → instruction to contact José first through the same official channels → existing WhatsApp
  number treatment → remaining forward-looking JVV message → bridge → staged chevron teaser.
- Keep the phone number in its existing `+34 624 44 26 73` treatment.
- Keep the teaser at the current `$ETAPA = 2` disclosure ceiling: green + orange chevrons only; no
  stage-3 tilde and no monogram.
- Remove the page's `prefers-reduced-motion: reduce` override so the wordmark, bridge, rate swap and
  chevron cascade retain their normal animation behavior under that device setting.
- José explicitly authorized this follow-up to be committed and pushed directly to `main` in this
  repository after the required pricing cross-review.
