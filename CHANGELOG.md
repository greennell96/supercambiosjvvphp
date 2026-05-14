# Changelog

All notable changes to supercambiosjvv.com are recorded here.

Format: `[version] - YYYY-MM-DD` with sections **Added**, **Changed**, **Fixed**, **Removed**.

---

## [Unreleased]

> Changes that are done locally but not yet uploaded to Hostinger.

### Fixed
- `supertasa.php` — page was blank due to `Swal.fire()` firing before `<body>` existed; moved DB error handling to after DOM is ready
- `supertasa.php` — JS error on `document.getElementById("timer")` (element doesn't exist on all tabs); added null guard

### Added
- `supertasa.php` — password login gate (session-based, bcrypt) with logout link in navbar; default password: `jvv2024`

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
