# SuperCambios JVV

**supercambiosjvv.com** — Servicio de remesas y cambio de divisas para la comunidad venezolana en Europa.

Envío seguro de dinero desde Europa a Venezuela. Cambios de Cripto → EUR/Bs. Más de 10,000 clientes satisfechos.

---

## What this site does

- Live exchange rate calculator (EUR → Bs, USD → EUR, Crypto → EUR)
- Service availability status with countdown timer
- Contact form with WhatsApp integration
- AML (Anti-Money Laundering) compliance forms and admin panel
- FAQ and About Us pages
- Seasonal visual effects (snow, etc.) controlled from the database

## Tech stack

| Layer | Tech |
|-------|------|
| Language | PHP |
| Database | MySQL (via `root.php` config) |
| Frontend | Vanilla JS, custom CSS |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts (Poppins, Inter) |
| Alerts | SweetAlert2 |
| Hosting | Hostinger (shared hosting) |

## File structure

```
/
├── index.php          # Homepage — rate calculator, status banner
├── aboutus.php        # About the founders (María & José)
├── contact.php        # Contact form
├── faq.php            # Frequently asked questions
├── supertasa.php      # Rate detail page
├── aml-review.php     # AML compliance review (admin)
├── aml-admin.php      # AML admin panel
├── aml-process.php    # AML form processing logic
├── aml-submit.php     # AML form submission handler
├── formularioaml.php  # AML form for users
├── aml-download-temp.php  # Temporary AML document download
├── ajax.php           # AJAX endpoints
├── header.php         # Shared header include
├── footermenu.php     # Shared footer include
├── root.php           # DB connection and global config
├── .htaccess          # URL routing and server config
├── css/               # Stylesheets
├── js/                # JavaScript files
├── images/            # Static images and flags
└── temp/              # Temporary files (AML docs, etc.)
```

## Database config

The site pulls live settings from a `config` table (row id=1):

| Column | Purpose |
|--------|---------|
| `status` | 1 = open, 0 = closed |
| `fee` | EUR → Bs rate |
| `ves2eur` | Bs → EUR rate |
| `usd2eur` | USD → EUR rate |
| `eur2usd` | EUR → USD rate |
| `countdown` | Show countdown timer |
| `countdown_time` | Timer value (HH:MM:SS) |
| `alertOn` | Show site-wide alert banner |
| `season` | Seasonal effect flag |
| `ef_snow` | Snow effect on/off |

## Deployment

Files are deployed directly to Hostinger via FTP or Hostinger's File Manager. There is no build step — PHP files are served as-is.

To update the site:
1. Edit files locally
2. Commit changes to this repo (see CHANGELOG.md)
3. Upload changed files to Hostinger

## Local development

You need a local PHP + MySQL server (e.g., XAMPP or Laragon). Copy `root.php` and set your local DB credentials there.

> `root.php` contains database credentials — **never commit real credentials to this repo.**

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of changes.
