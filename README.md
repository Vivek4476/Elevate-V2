# Elevate — ABSLI Sales Progression Platform

Internal promotion-eligibility dashboard for Aditya Birla Sun Life Insurance, Direct Marketing.
Every DSE can check where they stand against the four promotion gates, get a plain-language
action plan, run what-if simulations, and download a management-grade report.

**Live pattern:** static site, zero backend, zero build step. One HTML file + one data file.

---

## Project structure

```
dm-elevate/
├── index.html                      Application markup
├── elevate_data.json               Published company dataset (992 DSEs, Jul'25–Jun'26)
├── site.webmanifest                Web-app manifest (Add to Home Screen)
├── .nojekyll                       Tells GitHub Pages to serve files as-is
├── assets/
│   ├── css/
│   │   ├── styles.css              All application styles
│   │   └── fonts.css               Self-hosted font declarations
│   ├── js/
│   │   ├── app.js                  All application logic (data layer, engine, UI, admin)
│   │   └── xlsx.full.min.js        SheetJS 0.18.5 — Excel parsing (self-hosted)
│   ├── fonts/
│   │   └── Inter-roman.var.woff2   Inter variable font, full glyph set incl. ₹ (self-hosted)
│   └── img/
│       ├── absli-logo.png          Official ABSLI logo (the only logo in the app)
│       ├── apple-touch-icon.png    Home-screen icon (180×180)
│       └── favicon.png             Browser tab icon (64×64)
├── templates/                      CSV templates for the monthly admin upload
│   ├── employee_master.csv
│   ├── monthly_performance.csv
│   └── designation_targets.csv
└── README.md
```

There is **no build system, no node_modules, no framework** — plain HTML/CSS/JS, served as-is.
Every dependency is inside this folder; the app has **zero runtime CDN or network
dependencies** and works on an intranet or fully offline (aside from fetching its own
`elevate_data.json` alongside it).

## Deploy to GitHub Pages

1. Create a repository (e.g. `dm-elevate`) and push the contents of this folder to the root
   of the default branch.
2. Repo **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
3. The app is live at `https://<username>.github.io/dm-elevate/` within a minute or two.

That's it. On load, the app fetches `elevate_data.json` from the same folder — everyone who
opens the link sees the full 992-DSE company roster automatically.

## Dependencies — all vendored, none remote

| Dependency | Where | Purpose |
|---|---|---|
| SheetJS 0.18.5 | `assets/js/xlsx.full.min.js` | Excel parsing in the Admin Console |
| Inter (variable) | `assets/fonts/Inter-roman.var.woff2` | Typography (full glyph set — includes the ₹ rupee sign) |

Nothing loads from a CDN. If the font somehow fails, the system font stack
(SF Pro / Segoe UI / Roboto) takes over transparently.

## Monthly data refresh (admin workflow)

1. Open the app → **⚙ Admin console** (demo PIN: `7421`) → **Data Uploads** tab.
2. Drop the new `employee_master` and `monthly_performance` files (CSV or Excel;
   templates in `/templates`). Designation targets are optional — the built-in table is used.
3. Fix anything the **Validation** step flags (row-level errors with line numbers).
4. **Validation & Publish** tab → enter your name → **Publish dataset**.
5. Download the generated `elevate_data.json` and replace the one in this repo
   (commit + push). All users get the new data on next load.

Every publish is logged in **Audit Logs** and embedded in the exported JSON.

## Business rules (fixed in the engine)

Rolling trailing-12-month window ending at the assessment month.

1. WFYP achievement ≥ **75%** of the annual grade target
2. NOP achievement ≥ **50%**
3. Overall WAS > **100%** — `75% × WFYP% + 25% × NOP%`, each capped at 150%
4. Persistency ≥ **87%** (strict; new joiners with `NA` are exempt)

Grade targets are data (Designation Targets upload); the gates are code.
The engine reproduces the client Sales Progression sheet exactly and is covered by
benchmark profiles verified against real data.

## Configuration

- **Admin PIN:** search for `ADMIN_PIN` in `index.html` (default `7421`).
  Note: this is a soft gate to keep DSEs out of the console — the PIN is visible in page
  source and is **not** a security control.

## Known limitations (by design, pending backend phase)

- **OTP is simulated** — the code is shown on-screen for demo. Wiring a real SMS provider
  (MSG91 / Twilio / SNS) replaces two functions: `authSend()` and `authVerify()`.
- **Admin PIN is client-side** — real authentication (SSO) belongs to the backend phase.
- Browser `localStorage` persistence of admin uploads is per-device; the hosted
  `elevate_data.json` is the source of truth for all users.

## Roadmap

SMS-OTP backend · PWA (installable, offline) · Hindi/vernacular toggle ·
first-eligibility celebration · monthly WhatsApp/SMS nudges · dark mode.

---
Confidential — internal ABSLI tooling. © Aditya Birla Sun Life Insurance.
