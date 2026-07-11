# MAP.md — Elevate deployed-app survey (Migration Step 0)

*Read-only orientation for the Claude Code migration runbook. No code was changed to produce this.*
*Repo: `Vivek4476/Elevate-V2` · live: `elevate-v2-beta.vercel.app` · surveyed 2026-07-11.*

---

## 1. Stack & layout

- **Frontend:** a single self-contained, zero-build static file — **`index.html`** (~900 lines: inline CSS + vanilla ES5-style JS, no framework, no bundler). Logs in by DSE code, `fetch('/api/dse/:code')`, renders 5 pillars + Manager console client-side.
- **Backend:** **Vercel Serverless Functions** (Node.js, ESM) in **`api/`**:
  - `api/dse/[code].js` — runs the engine server-side, returns the per-DSE view model.
  - `api/admin.js` — data-health snapshot for the Manager console.
  - `api/otp.js` — stub (SMS-OTP deferred).
  - `api/_lib/data.js` — data-access layer (see §2).
- **Engine:** pure ES-module domain logic in **`engine/`**, unit-tested with `node --test` (see §5). Files: `incentiveEngine.js`, `spEngine.js`, `stage1.js`, `optimizer.js`, `bridge.js`, `transform.js`, `view.js`, `statement.js`, `designs/{apr26.js, spRules.js}`, `fixtures/`. `view.js#buildDseView(...)` assembles `{dse, earnings, career, bridge, attribution}`; `api/dse/[code].js` augments it with `perform` (12-mo series) and `profile` (rank/mix/etc.).
- **Other top-level:** `elevate_incentive.json` + `elevate_data.json` (repo data, §2), `scripts/seed-supabase.mjs`, `supabase/schema.sql`, `server/api.mjs` (local node:http runner, superseded by `api/` for deploy), `assets/img/`, `package.json` (type:module, `@supabase/supabase-js`), `vercel.json`, `DEPLOY.md`.
- **Build/deploy:** no build step. Vercel auto-deploys `main` on push (GitHub integration). Production alias `elevate-v2-beta.vercel.app`. Node 24.x runtime.

## 2. Data source (the "JSON-FALLBACK" path)

- All per-DSE data flows through **`api/_lib/data.js#getData()`**, cached per warm lambda.
  - **If `SUPABASE_URL` + a key are set** → reads Supabase tables `incentive` (`code,row`) and `sp_dataset` (`data`).
  - **Else → JSON fallback:** dynamic-imports the repo files **`elevate_incentive.json`** (incentive inputs, keyed by DSE code — target/WFYP/ULIP/persistency/NOP/holdFlag; 891 rows) and **`elevate_data.json`** (SP: `master`, `targets`, `monthly`, `meta`; 918 monthly / 992 master).
  - `dataSource()` returns the literal string **`'json-fallback'`** vs `'supabase'`. **This is the "JSON-FALLBACK" the Manager console displays** (`api/admin.js` → `source`). **Production is currently serving `json-fallback`** (repo JSON), not Supabase — verified live. Same data either way.
- `api/dse/[code].js` reads `data.inc[code]` (incentive inputs) + `data.sp` (SP), runs the engine, and returns the view model. **Shape produced:** `{dse, earnings, career, bridge, attribution, perform, profile}`. There is **no reconciled per-DSE contract today** — the app recomputes from inputs on every request.

## 3. The numbers — where incentive is annualized (the trust bug)

The displayed incentive **is not reconciled to the sheet** and the target/achievement are **framed annually**. Two distinct problems:

**(a) Value divergence — computed, not sheet-reconciled.**
- `engine/incentiveEngine.js:57` → `finalAmount = nopPayout − hold` (`// col AD`). For **AAA634 this yields ₹5,166**, but the **sheet's Final Amount is ₹5,356.34** — a ~₹190 divergence.
- `engine/incentiveEngine.js:6–7` even states *"Final Amount displayed to a DSE always comes from the sheet; `finalAmount` here is the computed check"* — **but the app displays the computed value**, because `elevate_incentive.json` carries only inputs, not the sheet's Final Amount column. There is **no reconcile gate**. → The runbook's pipeline (891/891 green, AAA634 = **₹5,356.34**) is the fix.

**(b) Annual framing (should be monthly):**
- `engine/incentiveEngine.js:38` → `achievement = (wfypOthers + ulipGap) / inp.target` — achievement % uses `target` (300000 for AAA634) as denominator.
- `engine/statement.js:51` → journey step **literally labeled `'Annual target'`** (`value: inputs.target`).
- `index.html:496` → i18n key `target:'Annual target'`.
- `index.html:718–719` → the **"Annual target" widget**: `tprog = (wfypOthers+ulipGap)/annualTarget*100`, capped 100%, renders "…% of target".
- `index.html:702–703` → Earnings hero ring shows `achievementPct` as **"177% · this month"** (achievement vs the annual-framed target, mislabeled monthly).
- `api/dse/[code].js:38` → `profile.annualTarget = +row.target`.
- **No literal `×12`** exists (that's not the mechanism); the annualization is the **target/achievement labeling + the un-reconciled final**. `engine/transform.js:43–44` `*12` is date-window math, not annualization.

## 4. Surfaces → fields & source

| Screen (render fn in index.html) | Key fields read | Source |
|---|---|---|
| **Today** `renderToday` | `bridge.{move,headline,incentiveImpact,promotionImpact}`, `earnings.headline.{finalAmount,onTheTable,baseline}`, `career.{progress,gatesCleared,eligible}`, `profile.{rolling.streak,rank.*}`, `earnings.achievement.{wfypOthers,ulipGap,nop,persCM}` | `api/dse/:code` → view.js + engine |
| **Perform** `renderPerform` | `perform.months[].{w,n}`, `profile.rolling.{streak,posMonths,nop}` | SP `monthly` via `api/dse` |
| **Earnings · Snapshot** | `earnings.headline.*`, `achievement.*` (incl. `achievementPct` **annual-framed**), `profile.productMix`, **`profile.annualTarget`**, `profile.persTrend` | incentiveEngine + profile |
| **Earnings · Statement** | `earnings.credits[]`, `earnings.deductions[]`, `headline` | statement.js |
| **Earnings · Journey** | `earnings.journey[]` (incl. **`'Annual target'`** step) | statement.js |
| **Earnings · Optimize** | `earnings.recommendations[]` | optimizer.js (runbook Step 5 deletes this tab) |
| **Career** `renderCareer` | `career.{wfypAch,nopAch,was,gates,gatesCleared,eligible,progress,persistencyValue,nextGate}`, `profile.{rank,zone,fullDesig}`, `perform.months` (momentum) | spEngine + profile |
| **Coach** `renderCoach` | `earnings.recommendations[]`, `bridge` | optimizer + bridge |
| **Manager console** `renderAdmin` | `api/admin` → `{incentive.rows, sp.rows, joined, coverage, byZone, byGrade, history, publishedBy, source}` | `api/admin.js` |
| **Limited state** (`profile.joined=false`) | `earnings.*` only; `career`/`bridge` null → clean "SP not linked" card | `api/dse` (incentive-only DSE) |
| **Live ticker** `buildTicker` | `earnings.headline.onTheTable`, `profile.{productMix,persTrend,rank,rolling}`, `career.gates` | (runbook Step 7/9 replaces this "fake-live crawl" with the Pulse feed) |

Coverage (from `api/admin`): **735 joined** (both SP + incentive), 156 incentive-only, 918 SP-only-ish. *(Note: runbook Step 2 cites a different split — 812 both / 79 incentive-only / 207 sp-only — computed by the new pipeline against the full sheets; reconcile during Step 2.)*

## 5. Tests / CI

- **Unit tests:** 9 `engine/*.test.js` files run via `node --test` (incentiveEngine, spEngine, stage1, optimizer, bridge, transform, view, statement, parity-app-sp) — the "55 tests" suite. Includes a 992-DSE parity test.
- **CI:** **none** — no `.github/workflows`. Nothing runs tests or a reconcile gate on push; Vercel just builds+deploys `main`. → Runbook Steps 1–2 add `pipeline/cli.py check` + the reconcile invariant to CI.

---

## Migration notes (carry forward)

- **Anchor:** AAA634 must read **₹5,356.34 monthly** post-migration (today: computed ₹5,166, annual-framed target/achievement).
- **De-annualize targets:** Steps 3–4 must remove the `'Annual target'` label + widget (`statement.js:51`, `index.html:496,718–719`) and reframe `achievementPct` as monthly.
- **Data seam for Step 3:** the single repoint point is **`api/_lib/data.js`** (+ the mapping in `api/dse/[code].js`) — introduce the contract there behind `elevate_contract_v3`, keep the current screens rendering via an adapter.
- **Supersedes recent UI work:** the runbook explicitly replaces the ticker (Step 7/9 → Pulse), removes the Optimize tab (Step 5), and folds Coach into Today (Step 7).

---

## Step 1 — pipeline landed (2026-07-11) ✅

- **Location:** `pipeline/` (the `elevate/` project from `elevate-phase-0-1.zip`). **Path reality (double name):** `cli.py` is at `pipeline/cli.py`; the importable Python package is at **`pipeline/pipeline/`** (engines, schemas, ingest, plan, contract, templates, tests). Real workbooks in `pipeline/data/`. So the runbook's `pipeline/engines/X` notation ⇒ physically **`pipeline/pipeline/engines/X`** (relevant for Step 2's `sp_calc.py`, `contract/`).
- **Env:** venv at `pipeline/.venv` (Python 3.14.6). Deps installed: openpyxl 3.1.5, **pandas 3.0.3**, **pandera 0.32.1**, numpy 2.5.1, pyxlsb, pytest (newer than the `>=2.0` pins — no breakage observed).
- **Run from repo root:** `./pipeline/.venv/bin/python pipeline/cli.py check` → **ALL CHECKS GREEN · 891/891 reconcile**; `./pipeline/.venv/bin/python -m pytest pipeline/pipeline/tests -q` → **5 passed**.
- **Golden confirmed:** AAA634 **final = ₹5,356.34** (fixture + workbook). Concrete deltas proving the app is wrong: pipeline WFYP achievement **1.8543** vs app 1.7667; post-persistency ₹10,202.55 vs app ₹9,840; NOP payout ₹7,141.78 vs app ₹6,888; final **₹5,356.34** vs app **₹5,166**. Per README, **`target_monthly` is MONTHLY** and the engine never annualises — so the app's ₹3L "Annual target" framing is doubly wrong.
- **Data privacy:** `pipeline/data/*.xlsx|*.xlsb` + `data/out/` + `.venv` are git-ignored — the real payout workbooks must NOT enter this **public** repo (they're dropped per-month via the admin console, Phase 4/Step 8).
- **No app changes.** Vercel Node build ignores `pipeline/` (not under `api/`), so deploy is unaffected.
- **Next: Step 2** — SP engine (`pipeline/pipeline/engines/sp_calc.py`) + per-DSE contract (`pipeline/pipeline/contract/`) + CI reconcile gate, per Build-Plan-v2 Phases 2–3.
