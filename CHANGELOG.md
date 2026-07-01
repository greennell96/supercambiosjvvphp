# Changelog

All notable changes to supercambiosjvv.com are recorded here.

Format: `[version] - YYYY-MM-DD` with sections **Added**, **Changed**, **Fixed**, **Removed**.

---

## [Unreleased]

> Changes that are done locally but not yet uploaded to Hostinger.

### Fixed
- `root.php` + `aml-process.php` — private files (`db-config.php`, `BLANK-WAYLLET-AML.docx`) now stored one level above `public_html`, outside Hostinger's git deploy path, so they survive every auto-deploy permanently
- `index.php` + `supertasa.php` — site no longer auto-opens at 15:00 with stale rates; open state now requires admin to click "Guardar" which sets DB status based on current time; auto-close at end of day is still time-based

### Fixed
- `supertasa.php` — page was blank due to `Swal.fire()` firing before `<body>` existed; moved DB error handling to after DOM is ready
- `supertasa.php` — JS error on `document.getElementById("timer")` (element doesn't exist on all tabs); added null guard

### Added
- `supertasa.php` — password login gate (session-based, bcrypt) with logout link in navbar; default password: `jvv2024`

### Fixed (hotfix)
- `supertasa.php` — 500 error on Hostinger caused by `require_once __DIR__` (absolute path incompatible with shared hosting); replaced with `session_start()` and kept `INCLUDE('root.php')` in original location
- `root.php` — added `session_status()` guard so `SESSION_START()` doesn't fire twice when auth gate has already started the session
- `.htaccess` — added CSP header allowing `unsafe-eval` so SweetAlert2 works (Hostinger blocks eval by default)
- `root.php` — split credentials into `db-config.php` (gitignored) so `root.php` can now live in git and won't be deleted by Hostinger auto-deploy

### Changed
- `index.php` — homepage hero redesigned around the rate calculator instead of a bare rate number; open/closed status pill lives inside the calculator card with a soft pulse animation; rate display restored to the bold hero-style format ("Tasa: XX"), positioned between the two inputs; tightened vertical spacing throughout the card
- `index.php` — each input now has its own currency chip (real flag PNG + code + chevron) instead of one shared corridor dropdown — flag swaps to match whichever currency is active in that box (Spain for EUR, Venezuela for VES, USA for USD); both chips open the same 4-corridor menu
- `index.php` — input labels now swap verb tense depending on which field the user is typing in ("¿Cuánto envías?"/"Recibirás:" vs "Tendrías que enviar:"/"¿Quieres recibir...?"), with a soft fade transition
- `index.php` — fixed pre-existing missing wrapper markup (`<section class="trust-section">`/`.trust-grid`) around the trust-cards, which had been rendering as loose unstyled divs

### Added
- `root.php` + `supertasa.php` + `index.php` — admin-managed testimonials: new `testimonios` table, a "Testimonios" tab in the admin panel (upload with image validation, reorder, toggle visibility, delete), and a homepage section displaying active testimonials

---

## [1.0.0] - 2026-05-14

### Added
- Initial commit — full site uploaded to GitHub
- Homepage with live exchange rate calculator (EUR/Bs, USD/EUR, Crypto/EUR)
- Service status banner with countdown timer
- AML compliance form system (user form, admin review panel, document download)
- Contact page with WhatsApp integration
- FAQ page
- About Us page (founders story)
- Seasonal effects system (snow, banners) controlled from database
- Site-wide alert banner system
