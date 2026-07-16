# Plan — the "What-If" Crystal-Ball Simulator (Design)

**Date:** 2026-07-16
**Status:** Approved design, pending spec review → implementation plan
**Surface:** New `Plan` surface in the Elevate DSE app (`index.html`)
**Scope decision:** Approach A (dedicated cockpit) as the complete core; Approach C (contextual doors from Earnings/Career) explicitly deferred to a fast-follow.

---

## 1. Purpose

Give a DSE a **goal-seek crystal ball**: they name a destination, and the app tells them — in detail, from their own real numbers — exactly what it will take to get there and where they will land. It answers "what will it take?" rather than making the DSE fiddle inputs and guess.

It spans **both windows** the app already models, kept rigorously separate per the project hard rule:

- **This month · ₹ incentive** — the monthly payout chain (`evaluateDSE`).
- **Rolling 12-mo · Promotion** — the four promotion gates (`evaluateSalesProgression`).

### The one non-negotiable rule
**Never fuse a Sales-Progression (rolling) number with an incentive (this-month) number in one widget or one figure.** They share names but differ by time window and source. In this surface the rule is honored *structurally*: goals are grouped by window, results render in window-tagged cards, and where a single action pays off in both windows it shows **two separately-labeled readouts that are never summed** ("this month · ₹" and "rolling 12-mo · promotion").

---

## 2. Goals a DSE can ask about (all four in scope)

Grouped and header-tagged by window in the goal picker:

**This month · ₹ incentive**
1. **Hit a ₹ target** — DSE sets a number; solver returns the smallest push on each lever that reaches it.
2. **Reach the next payout band / unlock full multiplier** — the discrete cliffs in the payout chain (next achievement slab, next ULIP grid slab, next NOP multiplier tier, persistency growth-booster).

**Rolling 12-mo · Promotion**
3. **Get promotion-eligible** — the binding gaps across the four gates (WFYP ≥75%, NOP ≥50%, WAS >100%, Persistency ≥87%), each in its native unit.
4. **When will I be promoted?** — forward projection at an assumed run-rate: how many months until the rolling window crosses each gate.

---

## 3. Solve mechanics (per destination)

All computation is **client-side, forward-scan** on the existing pure engines — no fragile algebraic inversion. Because the engines are pure (inputs in, full result out), the solver sweeps a lever upward and finds the smallest value that clears the target.

### 3.1 Hit a ₹ target (incentive)
- Base inputs come from the contract (see §5). Target defaults to a suggested stretch (e.g. next round number above the secured final) and is editable.
- For each actionable lever, hold the others at base and scan:
  - **Policies (NOP count):** `nop + 1, +2, …` → re-run `evaluateDSE` → smallest N where `finalAmount ≥ target`.
  - **WFYP others (₹ non-ULIP):** step `wfypOthers` upward → smallest ₹ that reaches target.
  - **ULIP FYP (₹ premium):** step `ulipFyp` (and the coupled `ulipGap`) upward → smallest ₹.
- Rank paths by achievability using `recommend.py`'s effort→probability heuristic (easy 0.80 / medium 0.40 / hard 0.15).
- **Guardrails:**
  - Target ≤ current secured final → "You've already secured this."
  - Target above the month's realistic ceiling → "Even maxing [lever], this month tops out at ₹Y — here's a realistic stretch (₹Z)." (Ceiling = scan until marginal gain flattens or a sane input bound is hit; never promise the impossible.)

### 3.2 Reach next band / max multiplier (incentive, structural)
- Enumerate the discrete cliffs from the design config:
  - next **achievement** slab (`achievementSlabs`),
  - next **ULIP grid** slab (`ulipGrid.slabs`),
  - next **NOP multiplier** tier (`nopMultiplier`),
  - **persistency growth-booster** threshold.
- For each: exact gap to cross (in the lever's unit) + the ₹ jump in `finalAmount` it unlocks. Rank by ₹-per-effort. Reuses `recommend.py`'s `_next_from`. These are frequently the highest-leverage moves (a multiplier-tier flip beats linear grinding).

### 3.3 Get promotion-eligible (rolling)
- From the SP block (all present today — §5): `wfyp.ytd_target/ytd_ach`, `nop.ytd_target/ytd_ach`, `persistency_overall`, `overall_was`.
- Per unmet gate, express the gap in its **native unit**:
  - **WFYP gate:** ₹ of rolling WFYP short of `0.75 × wfyp.ytd_target`.
  - **NOP gate:** policies short of `0.50 × nop.ytd_target` (ceil).
  - **WAS gate:** need `overall_was > 1.0`; since WAS = `cap(wfypAch)·w_wfyp + cap(nopAch)·w_nop`, show the lift via whichever component is liftable (respecting the per-component `ach_cap`).
  - **Persistency gate:** `persistency_overall ≥ 0.87` — framed as a **quality behavior** ("hold renewals ≥ 87%"), not an additive "sell more" lever.
- Thinnest gate first (reuse the existing "closest gate" pattern / `thinnest_gate`).

### 3.4 When will I be promoted (rolling, projection)
- Run-rate `r` with a **user-toggle basis**: "at this month's pace" (this-month WFYP/NOP actuals) vs "at my trailing-12 average" (`ytd_ach / 12`).
- First-order window roll: trailing total after `k` months ≈ `current_trailing + k · (r − current_trailing/12)` (drop the average old month, add the new month at rate `r`). Solve for the smallest `k` where each gate's threshold is crossed; the **slowest gate = the promotion ETA**.
- Rendered explicitly as an estimate at the chosen pace ("at your current pace, ~N months"). No fake precision. Nudging the pace shows the ETA move — this is where goal-seek and projection meet ("to be promoted by December, you'd need to run at rate r").
- **Assumption called out in UI:** persistency and the WAS caps complicate a pure linear roll; the projection assumes persistency stays at/above threshold and applies the per-component cap. Stated, not hidden.

---

## 4. Result / readout layout

- **Verdict line** in the goal's own window: *"To reach ₹8,000 this month: sell 6 more policies"* / *"You're 2 gates from promotion."*
- **Path cards**, ranked by achievability. Each card:
  - the action ("Sell 6 more policies"),
  - the **primary readout** in the goal's window (₹ or gate progress),
  - a **difficulty meter** (reuse existing effort chips),
  - the **secondary tagged readout** — the *other* window's side-effect ("also +X% toward your rolling NOP gate" / "those policies are worth +₹X this month"). Never summed with the primary.
- **"Show the math"** collapsible per path (reuse the balance-sheet ledger pattern) — explainable down to the slab, not magic.
- Two windows never share a widget; when both appear they sit in **separate header-tagged cards**.
- Reduced-motion-safe count-ups on the numbers (reuse existing count-up/NumberFlow + `cubic-bezier(.05,.7,.1,1)` signature easing).
- Follows the established visual system: paper `#FAF6F2`, maroon `#96172E/#6E0F21`, sun gradient `#F58220→#FDB913`; **green = banked, gold = opportunity/"on the table"** (not alarm-red); mono/tabular figures for all ₹; Lucide line icons via the existing `svic()` sprite.

---

## 5. Data flow & plumbing

### 5.1 What the contract already exposes (verified 2026-07-16)
- **Incentive inputs** the solver needs are already read by `adapt.js`: `target_monthly`, `wfyp.non_ulip` (=`wfypOthers`), `wfyp.ulip_gap` (=`ulipGap`), `ulip.fyp` (=`ulipFyp`), `nop.count`, `persistency.cm/lm`. `holdNotAchieved` is recoverable from `pifa.hold_amount > 0`.
- **SP inputs** the solver needs are already emitted by `sp_calc.py` / `sp_block`: `wfyp.ytd_target`, `wfyp.ytd_ach`, `nop.ytd_target`, `nop.ytd_ach`, `persistency_overall`, `overall_was`, `gates`, `thinnest_gate`.
- **Conclusion: no pipeline / `contract/build.py` change is required.** The gate gaps compute directly from fields already in the contract.

### 5.2 Client-side compute
- The pure engines (`engine/incentiveEngine.js`, `engine/spEngine.js`) and the design config (`engine/designs/apr26.js`, `spRules.js`) are ES modules; the app is a build-less single `index.html`. **Inline/vendor** them into the app the same way it already vendors assets (a `<script>` block or vendored module), exposing a small `Sim` namespace. No network round-trip per keystroke.
- **Surface raw inputs to the client:** extend `adapt.js` (or the `/api/dse/[code].js` response) to attach a `sim` block to the view-model carrying the raw incentive inputs (§5.1) + raw SP absolutes/targets + the active design-config id. This is the only adapter change. The Plan surface reads `VM.sim`.

### 5.3 Parity lock (trust anchor)
- At the DSE's **unchanged base inputs**, the client engine's `finalAmount` MUST equal the frozen contract `final` (AAA634 → ₹5,356.34). A test asserts equality within ±₹0.01.
- Rationale: if the client engine and the frozen payout ever diverge, the simulator is silently lying. This is a hard gate, same spirit as the pipeline reconcile gate.

### 5.4 Ephemerality
- A simulation is **client-only and ephemeral** — never persisted, never written back, never overwrites the frozen contract. The frozen payout remains the single source of truth for what a DSE actually earned.

---

## 6. Testing & verification

- **Unit tests** (pure, node) on the new goal-seek solver functions, golden-anchored to AAA634:
  - "reach ₹X" → expected smallest N / ₹ per lever;
  - "next band" → correct cliff + unlocked ₹;
  - "get eligible" → correct per-gate gaps in native units;
  - "projection" → sane, monotone months vs pace.
- **Parity test** extending `test/adapt.test.js`: client engine at base inputs == contract final for AAA634.
- **Headless** (puppeteer-core + system Chrome, already in place): drive the Plan surface for AAA634, screenshot each of the 4 destinations, assert zero console errors and that the two-window tags render in separate cards.
- **Regression:** existing suites stay green (node 59/59, pipeline reconcile 891/891 + 1020/1020).

---

## 7. Scope guard (YAGNI)

- Projection uses the **trailing-12 run-rate already available** (labeled estimate). **No new historical-data ingestion.** BDA/lapsed add-ons and real multi-month history are out of scope.
- **No server-side goal-seek API** — client-only for the MVP.
- **Contextual doors (Approach C)** — Earnings/Career CTAs that deep-link into Plan pre-set — are a **fast-follow**, not in this build.
- No new gamification (badges/coins) — money-literate DSEs respond to real numbers + restraint (established design finding).

---

## 8. Open questions / assumptions to confirm during planning

1. **Nav placement:** 5th bottom-nav item `Plan` (recommended; still ≤5) vs a launched full-screen sheet from Today. Assumed: 5th nav item.
2. **Default ₹ target** for destination 1 (suggested stretch value) — pick a sensible rule (next round number above secured final) during implementation.
3. **Projection pace default:** "this month's pace" vs "trailing-12 average." Assumed default: trailing-12 average (more stable), with a toggle to this-month pace.
