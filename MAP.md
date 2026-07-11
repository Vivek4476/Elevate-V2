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
---

## Step 2 — SP engine + contract + CI gate (2026-07-11) ✅

- **SP engine** `pipeline/pipeline/engines/sp_calc.py` — rolling-12-month, independent of the incentive engine. `compute_sp(inputs, plan)`. Golden AAA634: wfyp_ach 0.5495, nop_ach 0.86, overall_was 0.6271, gates {wfyp_75:F, nop_50:T, was_100:F, persistency_87:T}, eligible=false, tier="on_track", binding "Final WAS Score", ladder PM→SPMG→CPM. **Reverse-engineered sheet rule: each component achievement is capped at 1.5 in the WAS term** (`plan.sp.ach_cap=1.5`; `was_cap=1.5` guard) — with that, **SP reconciles 1020/1020** (WAS ±0.001 + Yes/No gate flags). Tier veto: `pip_remarks="Not Eligible for PIP"` overrides a residual PIP-target value.
- **Join reality:** incentive `employee_code` (603310) == SP `dse_id` (603310); the agent code AAA634 lives in incentive `agent_code` / SP `dse_bo_code`. Contract top-level `dse_id` = agent code.
- **Contract** `pipeline/pipeline/contract/{schema.py,build.py}` — `cli.py build --month 2026-04` writes `data/out/dse/<agent>.json` + `manifest.json`. Cadence-stamped `incentive`(monthly)/`sp`(rolling) blocks, never merged; missing block ⇒ null; `recoverable` levers, `addons_pending:null`, `forecast:{placeholder}`. **1098 contracts; coverage 812 both / 79 incentive-only / 207 sp-only** (matches the runbook exactly; supersedes the app's 735 which used a wrong join key).
- **`cli.py check`** now also runs SP golden + SP 1020/1020 reconcile + incentive↔SP field-disjoint. **CI** `.github/workflows/ci.yml` runs `pytest` (golden + disjoint always; the 4 full-sheet reconcile tests skip when workbooks absent — they're git-ignored). Verified: 9/9 local, 5-pass/4-skip data-free.
- `data/out/` is git-ignored (generated contracts). **No app changes.**
---

## Step 3 — repoint app to the contract, behind a flag (2026-07-12) ✅

- **Flag:** env `ELEVATE_CONTRACT_V3` (`1/true/on/yes`). Default OFF → app byte-for-byte unchanged. Checked with `contractEnabled()` in `api/_lib/data.js`.
- **Contract source:** `getContract(code)` in `api/_lib/data.js` — Supabase `contract(dse_id, data jsonb)` when configured, else local `pipeline/data/out/dse/<agent>.json` (dev). Null ⇒ graceful fallback to the computed view.
- **Adapter:** `api/_lib/adapt.js#applyContract(view, contract)` maps the reconciled contract onto the exact existing view-model — overrides `earnings` (headline/achievement/credits/deductions/journey), `career` (gates/was/eligible/progress/nextGate/tier), bridge eligibility + headline, and `profile` (productMix/persTrend/annualTarget). Leaves recommendations, the 12-mo `perform` series, and rank as the JS scaffold (superseded in Steps 5–7). Stamps `view.dataSource='contract-v3'`.
- **Hook:** `api/dse/[code].js` builds the JS view (joined or incentive-only), then if `contractEnabled()` applies the contract (try/catch → fall back).
- **Verified (headless, no console errors):** flag OFF → ₹5,166 · 176.7% · 4/4 eligible (unchanged); flag ON → **₹5,356.34 · 185.4% · 2/4 NOT eligible · nextGate WFYP · tier on_track**, ticker "GATES 2/4", no confetti, Career reads "Rolling · never resets". All suites green (pipeline 891/891+1020/1020, pytest 9/9, engine 55/55).
- **Also fixed:** `sp_calc.thinnest_gate` = the unmet gate CLOSEST to clearing (max margin) → AAA634 nextGate = WFYP (was returning WAS).
- **Supabase delivery (option 1):** `supabase/schema.sql` adds the `contract` table; `scripts/seed-contract.mjs` (`npm run seed:contract`) upserts the generated contracts. **Prod enablement (user step, staging→prod):** run schema → `pipeline/cli.py build` → `npm run seed:contract` → set `ELEVATE_CONTRACT_V3=1` in Vercel. Flag stays OFF until then, so this push doesn't change production.
---

## Step 4 — de-annualize + parity + default-on (2026-07-12) ✅

- **No annual framing remains** (grep `annualTarget|Annual target` in index.html/api/engine = empty): `statement.js:51` + `adapt.js` journey label → **"Monthly target"**; i18n `target` → "Monthly target"/"मासिक लक्ष्य"; the target widget's `annualTarget` field renamed **`monthlyTarget`** (api `buildProfile`, adapt, index.html), and its label uncapped — shows the **real %** ("185% of monthly target"), bar still visually capped at 100%. Earnings context chip → **"Monthly · Apr '26"**; hero → "ESTIMATED INCENTIVE · MONTHLY · APRIL".
- **Flag now default ON** (`contractEnabled()` = true unless `ELEVATE_CONTRACT_V3` is `0/false/off`). Safe pre-seed: when on but no contract exists, `getContract` returns null → API falls back to the computed view. Verified: default → ₹5,356.34/2-of-4; `=0` kill-switch → ₹5,166/4-of-4.
- **Parity test** `test/adapt.test.js` (wired into `npm test`): asserts the displayed field == contract `final` (AAA634 = ₹5,356.34), SP eligibility/gates from the contract (2/4, not eligible, nextGate WFYP), monthly-not-annual, no "Annual" in the journey, + a data-gated sweep over generated contracts. **59/59 node tests pass** (55 engine + 4 parity); pipeline check still 891/891 + 1020/1020.
- **Prod note:** default-on ships, but production shows ₹5,166 until Supabase is seeded (graceful fallback) — enablement = run the `contract` table SQL → `cli.py build` → `npm run seed:contract` (Supabase env). No app breakage either way.
- **Correctness core COMPLETE (Steps 0–4).**

---

## Step 5 — Money surface reshaped (2026-07-12) ✅

`renderEarnings` rebuilt as one contract-driven scroll (no tabs): **forecast placeholder** → **Secured hero** (Monthly · Apr '26 badge, ₹5,356.34 count-up, achievement ring, "Potential ₹10,203 · ₹4,846 recoverable") → this-month stats → **"On the table · recoverable ₹4,846"** with **lever cards** ("Lift your NOP multiplier +₹3,061 · Sell more policies" flag when nopMult<1; "Release the PIFA hold +₹1,785") → product-mix/monthly-target/persistency-trend → collapsible `<details>` **"Show the math"** waterfall → **Coach link**. **Optimize tab deleted** (moves live in Coach). Fixed a hero-ring clip via `flex:1;min-width:0`. Verified headless (no tabs, forecast, 2 levers, math+coachlink, ₹5,356, no errors); 59/59 node tests. Only `index.html` changed.
---

## Step 6 — Climb surface (2026-07-12) ✅

`renderCareer` rebuilt on the `sp` block: **Rolling · 12-mo badge**; **WAS ring** (overall_was toward 100% — AAA634 63%, orange/unmet, green when cleared); **tier chip** (promotion=green / on_track=gold / pip=amber / termination_risk=red — AAA634 "On track"); **binding-constraint headline** ("Final WAS Score is the binding constraint. Lift WFYP achievement to move up."); **four gates ranked by margin** (unmet closest-first, then cleared), **thinnest flagged "Closest"** with "+X% to go" (AAA634 → WFYP +20%, then WAS +37%, then NOP/Persistency cleared); ladder, rank strip, momentum, benefits retained ("annual band"→"target band"). "Hold it" state when eligible. Adapter now exposes `career.tier` + `career.bindingConstraint`; renderCareer derives tier/binding when absent (computed fallback safe). Verified headless (On track, WAS 63%, WFYP flagged Closest, no errors); 59/59 tests. index.html + adapt.js.
- **Next: Step 7 — Now** (rebuild Today into the decision surface: two-statement verdict (SP eligibility + incentive recoverable, separate), hero move, **fold Coach in**, **kill the ticker as fake-live crawl**). Build-Plan-v2 Phase 5 → Now.
