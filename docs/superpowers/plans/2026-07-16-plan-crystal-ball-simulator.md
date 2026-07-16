# Plan — What-If Crystal-Ball Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `Plan` surface where a DSE names a destination (a ₹ target, a payout band, promotion-eligibility, or a promotion ETA) and the app goal-seeks — from their own contract numbers — exactly what it takes and where they land.

**Architecture:** Pure goal-seek solvers (`engine/simulate.js`) forward-scan the existing pure engines (`incentiveEngine.js`, `spEngine.js`) — no algebraic inversion. The server attaches a raw-inputs `sim` block to the view-model; a browser bridge exposes the same pure functions as `window.Sim`; `renderPlan()` in `index.html` drives the UI. A parity test locks the client engine at base inputs to the frozen contract final.

**Tech Stack:** Vanilla JS ES modules (`engine/`), `node:test` runner, build-less `index.html`, Vercel serverless (`api/`), puppeteer-core headless verification.

## Global Constraints

- **HARD RULE:** Never fuse a Sales-Progression (rolling-12mo, %) number with an incentive (this-month, ₹) number in one widget or one figure. Cross-window effects render as **two separately-labeled readouts, never summed** — tagged "this month · ₹" vs "rolling 12-mo · promotion".
- **Terminology:** users are **DSEs** — never "advisors"/"agents" in UI copy.
- **Visual system:** paper `#FAF6F2`, maroon `#96172E`/`#6E0F21`, sun gradient `#F58220→#FDB913`; **green = banked, gold = opportunity/"on the table"** (not alarm-red); mono/tabular figures for all ₹; Lucide line icons via existing `svic(name)` sprite; signature easing `cubic-bezier(.05,.7,.1,1)`; reduced-motion-safe.
- **Node:** `>=20`. Test command: `npm test` → `node --test 'engine/*.test.js' 'test/*.test.js'`.
- **Design config source of truth:** `engine/designs/apr26.js` (`APR26`) and `engine/designs/spRules.js` (`SP_RULES`). Do not hard-code slab values elsewhere.
- **Golden DSE:** AAA634 (Lakshya) — monthly final **₹5,356.336356**; SP 2/4 gates, not eligible, thinnest gate `wfyp`.
- Simulations are **client-only and ephemeral** — never persisted, never overwrite the contract.
- No new gamification; no new historical-data ingestion; no server-side goal-seek API. Contextual doors (Earnings/Career deep-links) are OUT of scope (fast-follow).

---

## File Structure

**Create:**
- `engine/simulate.js` — pure goal-seek solvers (ES module).
- `engine/simulate.test.js` — solver unit tests (auto-picked by `engine/*.test.js`).
- `test/sim-parity.test.js` — parity lock: client engine at base inputs == contract final.

**Modify:**
- `api/dse/[code].js` — attach `view.sim` raw-inputs block (works for both contract and JSON-fallback paths).
- `api/_lib/adapt.js` — when a contract is present, reconcile `view.sim.incentive` to the contract's raw inputs so the client engine reproduces the frozen final.
- `index.html` — nav tab + `v_plan` section + browser-bridge `<script type="module">` + `renderPlan()` and helpers; wire into `renderAll()`.

---

## Task 1: `reachTargetPaths` — ₹ target goal-seek (incentive)

**Files:**
- Create: `engine/simulate.js`
- Test: `engine/simulate.test.js`

**Interfaces:**
- Consumes: `evaluateDSE(design, inputs)` from `./incentiveEngine.js` (returns `{finalAmount,...}`); `APR26` from `./designs/apr26.js`.
- Produces:
  - `reachTargetPaths(design, inputs, target) -> { target, alreadySecured:boolean, ceiling:number, paths: Path[] }`
  - `Path = { lever:'nop'|'wfypOthers'|'ulipFyp', unit:'policies'|'rupees', need:number, to:number, projectedFinal:number, effort:'easy'|'medium'|'hard' }`
  - Base inputs shape (from `evaluateDSE`): `{ target, wfypOthers, ulipGap, ulipFyp, persCM, persLM, nop, holdNotAchieved }`.

- [ ] **Step 1: Write the failing test**

```js
// engine/simulate.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APR26 } from './designs/apr26.js';
import { evaluateDSE } from './incentiveEngine.js';
import { reachTargetPaths } from './simulate.js';

// AAA634 base inputs (derived from the pinned golden contract).
const AAA634 = {
  target: 300000, wfypOthers: 6303.03, ulipGap: 550000, ulipFyp: 550000,
  persCM: 0.95415, persLM: 0.94867, nop: 1, holdNotAchieved: true,
};
const baseFinal = () => evaluateDSE(APR26, AAA634).finalAmount;

test('reachTargetPaths: target below secured → alreadySecured, no paths', () => {
  const r = reachTargetPaths(APR26, AAA634, baseFinal() - 100);
  assert.equal(r.alreadySecured, true);
  assert.deepEqual(r.paths, []);
});

test('reachTargetPaths: each path actually reaches the target and is minimal', () => {
  const target = baseFinal() + 1500;
  const r = reachTargetPaths(APR26, AAA634, target);
  assert.ok(r.paths.length > 0, 'expected at least one path');
  for (const p of r.paths) {
    // the recommended push reaches the target
    assert.ok(p.projectedFinal >= target - 0.01, `${p.lever} should reach target`);
    // one step less than recommended does NOT reach it (minimality)
    if (p.lever === 'nop') {
      const less = evaluateDSE(APR26, { ...AAA634, nop: AAA634.nop + p.need - 1 }).finalAmount;
      assert.ok(less < target, 'nop path must be minimal');
    } else {
      const key = p.lever;
      const patch = key === 'ulipFyp'
        ? { ulipFyp: AAA634.ulipFyp + p.need - 1, ulipGap: AAA634.ulipGap + p.need - 1 }
        : { [key]: AAA634[key] + p.need - 1 };
      const less = evaluateDSE(APR26, { ...AAA634, ...patch }).finalAmount;
      assert.ok(less < target + 0.01, 'rupee path must be near-minimal');
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test engine/simulate.test.js`
Expected: FAIL — `Cannot find module './simulate.js'` / `reachTargetPaths is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// engine/simulate.js
// Pure goal-seek solvers over the existing pure engines. No DOM, no globals, no network.
// Forward-scan / bisection only — never algebraic inversion. Incentive (this-month ₹) and
// SP (rolling-12mo) logic stay in separate functions and are NEVER summed together.
import { evaluateDSE } from './incentiveEngine.js';

const effortPolicies = (n) => (n <= 1 ? 'easy' : n <= 3 ? 'medium' : 'hard');
const effortRupees = (x) => (x <= 100000 ? 'medium' : 'hard');

// smallest integer policies to reach target, or null within maxAdd
function smallestPolicies(design, inputs, target, maxAdd = 50) {
  for (let k = 1; k <= maxAdd; k++) {
    if (evaluateDSE(design, { ...inputs, nop: inputs.nop + k }).finalAmount >= target) return k;
  }
  return null;
}

// smallest ₹ added via `apply(x)` to reach target (monotone bisection), or null if hi can't reach.
function smallestRupees(design, inputs, apply, target, hi = 5_000_000) {
  if (evaluateDSE(design, apply(inputs, hi)).finalAmount < target) return null;
  let lo = 0, h = hi;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + h) / 2;
    if (evaluateDSE(design, apply(inputs, mid)).finalAmount >= target) h = mid; else lo = mid;
  }
  return Math.ceil(h);
}

const applyWfyp = (inp, x) => ({ ...inp, wfypOthers: inp.wfypOthers + x });
const applyUlip = (inp, x) => ({ ...inp, ulipFyp: inp.ulipFyp + x, ulipGap: inp.ulipGap + x });

// month ceiling: final when every lever is pushed hard (upper reference for "realistic stretch")
function monthCeiling(design, inputs) {
  const maxed = { ...inputs, nop: inputs.nop + 50, wfypOthers: inputs.wfypOthers + 5_000_000,
    ulipFyp: inputs.ulipFyp + 5_000_000, ulipGap: inputs.ulipGap + 5_000_000 };
  return evaluateDSE(design, maxed).finalAmount;
}

export function reachTargetPaths(design, inputs, target) {
  const base = evaluateDSE(design, inputs).finalAmount;
  const ceiling = monthCeiling(design, inputs);
  if (target <= base) return { target, alreadySecured: true, ceiling, paths: [] };

  const paths = [];
  const nP = smallestPolicies(design, inputs, target);
  if (nP != null) paths.push({ lever: 'nop', unit: 'policies', need: nP, to: inputs.nop + nP,
    projectedFinal: evaluateDSE(design, { ...inputs, nop: inputs.nop + nP }).finalAmount, effort: effortPolicies(nP) });

  const wR = smallestRupees(design, inputs, applyWfyp, target);
  if (wR != null) paths.push({ lever: 'wfypOthers', unit: 'rupees', need: wR, to: inputs.wfypOthers + wR,
    projectedFinal: evaluateDSE(design, applyWfyp(inputs, wR)).finalAmount, effort: effortRupees(wR) });

  const uR = smallestRupees(design, inputs, applyUlip, target);
  if (uR != null) paths.push({ lever: 'ulipFyp', unit: 'rupees', need: uR, to: inputs.ulipFyp + uR,
    projectedFinal: evaluateDSE(design, applyUlip(inputs, uR)).finalAmount, effort: effortRupees(uR) });

  const rank = { easy: 0, medium: 1, hard: 2 };
  paths.sort((a, b) => rank[a.effort] - rank[b.effort]);
  return { target, alreadySecured: false, ceiling, paths };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test engine/simulate.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add engine/simulate.js engine/simulate.test.js
git commit -m "feat(sim): reachTargetPaths — ₹ target goal-seek over the incentive engine"
```

---

## Task 2: `nextBandPaths` — structural cliffs (incentive)

**Files:**
- Modify: `engine/simulate.js`
- Test: `engine/simulate.test.js`

**Interfaces:**
- Consumes: `APR26.achievementSlabs`, `APR26.ulipGrid.slabs`, `APR26.nopMultiplier`; `evaluateDSE`.
- Produces: `nextBandPaths(design, inputs) -> Cliff[]` where `Cliff = { lever:'achievement'|'ulipGrid'|'nop', label:string, need:number, unit:'rupees'|'policies', to:number, deltaFinal:number, effort }`.

- [ ] **Step 1: Write the failing test**

```js
// append to engine/simulate.test.js
import { nextBandPaths } from './simulate.js';

test('nextBandPaths: AAA634 next achievement cliff is the 2.00 slab, delta positive', () => {
  const cliffs = nextBandPaths(APR26, AAA634);
  const ach = cliffs.find((c) => c.lever === 'achievement');
  assert.ok(ach, 'expected an achievement cliff');
  assert.equal(ach.to, 2.00);              // current ach 1.854 → next slab from=2.00
  assert.ok(ach.deltaFinal > 0);
  // reaching exactly the cliff lifts achievement to >= 2.00
  const credited = AAA634.wfypOthers + AAA634.ulipGap + ach.need;
  assert.ok(credited / AAA634.target >= 2.00 - 1e-9);
});

test('nextBandPaths: AAA634 next NOP tier is 2 (from count 1), delta positive', () => {
  const cliffs = nextBandPaths(APR26, AAA634);
  const nop = cliffs.find((c) => c.lever === 'nop');
  assert.equal(nop.to, 2);
  assert.equal(nop.need, 1);
  assert.ok(nop.deltaFinal > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test engine/simulate.test.js`
Expected: FAIL — `nextBandPaths is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// append to engine/simulate.js
const nextFrom = (bands, x) => { for (const b of bands) if (b.from > x) return b.from; return null; };

export function nextBandPaths(design, inputs) {
  const base = evaluateDSE(design, inputs).finalAmount;
  const cliffs = [];

  // achievement slab
  const credited = inputs.wfypOthers + inputs.ulipGap;
  const achNow = inputs.target ? credited / inputs.target : 0;
  const achTo = nextFrom(design.achievementSlabs, achNow);
  if (achTo != null && inputs.target) {
    const need = achTo * inputs.target - credited;
    if (need > 0) cliffs.push({ lever: 'achievement', label: `Reach ${Math.round(achTo * 100)}% achievement`,
      need, unit: 'rupees', to: achTo,
      deltaFinal: evaluateDSE(design, { ...inputs, wfypOthers: inputs.wfypOthers + need }).finalAmount - base,
      effort: need <= 100000 ? 'medium' : 'hard' });
  }

  // ULIP grid slab
  const ulipTo = nextFrom(design.ulipGrid.slabs, inputs.ulipFyp);
  if (ulipTo != null) {
    const need = ulipTo - inputs.ulipFyp;
    if (need > 0) cliffs.push({ lever: 'ulipGrid', label: `Reach the ₹${ulipTo.toLocaleString('en-IN')} ULIP slab`,
      need, unit: 'rupees', to: ulipTo,
      deltaFinal: evaluateDSE(design, { ...inputs, ulipFyp: inputs.ulipFyp + need, ulipGap: inputs.ulipGap + need }).finalAmount - base,
      effort: need <= 100000 ? 'medium' : 'hard' });
  }

  // NOP multiplier tier
  const nopTo = nextFrom(design.nopMultiplier, inputs.nop);
  if (nopTo != null) {
    const need = nopTo - inputs.nop;
    cliffs.push({ lever: 'nop', label: `Reach ${nopTo} policies (next multiplier)`,
      need, unit: 'policies', to: nopTo,
      deltaFinal: evaluateDSE(design, { ...inputs, nop: nopTo }).finalAmount - base,
      effort: need <= 1 ? 'easy' : need <= 3 ? 'medium' : 'hard' });
  }

  return cliffs.filter((c) => c.deltaFinal > 0.005).sort((a, b) => b.deltaFinal - a.deltaFinal);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test engine/simulate.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/simulate.js engine/simulate.test.js
git commit -m "feat(sim): nextBandPaths — structural payout cliffs"
```

---

## Task 3: `promotionGaps` — rolling gate gaps (SP)

**Files:**
- Modify: `engine/simulate.js`
- Test: `engine/simulate.test.js`

**Interfaces:**
- Consumes: `SP_RULES` from `./designs/spRules.js`; `evaluateSalesProgression(rules, spInp)`.
- SP input shape: `{ trailingWfyp, trailingNop, targetWfyp, targetNop, persistency }` (absolutes + annual targets).
- Produces: `promotionGaps(rules, spInp) -> { eligible:boolean, gaps: Gap[], thinnest:string|null }` where `Gap = { gate:'wfyp'|'nop'|'was'|'persistency', met:boolean, unit:'rupees'|'policies'|'ratio'|'quality', need:number, note:string }`.

- [ ] **Step 1: Write the failing test**

```js
// append to engine/simulate.test.js
import { SP_RULES } from './designs/spRules.js';
import { promotionGaps } from './simulate.js';

// Synthetic rolling inputs with round numbers so gaps are hand-checkable.
// wfyp: 60% of target (needs 75%) ; nop: 40% (needs 50%) ; persistency below 87%.
const SP = { trailingWfyp: 600000, targetWfyp: 1000000, trailingNop: 40, targetNop: 100, persistency: 0.80 };

test('promotionGaps: WFYP gap = ₹ to reach 75% of target', () => {
  const r = promotionGaps(SP_RULES, SP);
  const g = r.gaps.find((x) => x.gate === 'wfyp');
  assert.equal(g.met, false);
  assert.equal(g.unit, 'rupees');
  assert.equal(g.need, 150000);   // 0.75*1_000_000 - 600_000
});

test('promotionGaps: NOP gap = policies to reach 50% of target', () => {
  const r = promotionGaps(SP_RULES, SP);
  const g = r.gaps.find((x) => x.gate === 'nop');
  assert.equal(g.unit, 'policies');
  assert.equal(g.need, 10);       // ceil(0.50*100 - 40)
});

test('promotionGaps: persistency gate framed as quality, not additive', () => {
  const r = promotionGaps(SP_RULES, SP);
  const g = r.gaps.find((x) => x.gate === 'persistency');
  assert.equal(g.unit, 'quality');
  assert.equal(g.met, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test engine/simulate.test.js`
Expected: FAIL — `promotionGaps is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// append to engine/simulate.js
import { evaluateSalesProgression } from './spEngine.js';

export function promotionGaps(rules, spInp) {
  const { gates, was } = rules;
  const state = evaluateSalesProgression(rules, {
    trailingWfyp: spInp.trailingWfyp, trailingNop: spInp.trailingNop,
    targetWfyp: spInp.targetWfyp, targetNop: spInp.targetNop, persistency: spInp.persistency,
  });
  const gaps = [];

  // WFYP gate → ₹ short of wfypMin × target
  const wfypNeed = Math.max(0, gates.wfypMin * spInp.targetWfyp - spInp.trailingWfyp);
  gaps.push({ gate: 'wfyp', met: state.gates.wfyp, unit: 'rupees', need: Math.ceil(wfypNeed),
    note: `₹${Math.ceil(wfypNeed).toLocaleString('en-IN')} more rolling WFYP to clear 75%` });

  // NOP gate → policies short of nopMin × target
  const nopNeed = Math.max(0, Math.ceil(gates.nopMin * spInp.targetNop - spInp.trailingNop));
  gaps.push({ gate: 'nop', met: state.gates.nop, unit: 'policies', need: nopNeed,
    note: `${nopNeed} more policies to clear 50%` });

  // WAS gate → lift via whichever component is capped-liftable (ratio units)
  gaps.push({ gate: 'was', met: state.gates.was, unit: 'ratio',
    need: Math.max(0, gates.wasMin - state.was),
    note: state.gates.was ? 'WAS above 100%' : 'Lift WFYP/NOP to push WAS above 100%' });

  // Persistency gate → quality behaviour, not additive
  gaps.push({ gate: 'persistency', met: state.gates.persistency, unit: 'quality',
    need: Math.max(0, gates.persistencyMin - (spInp.persistency ?? 0)),
    note: 'Hold renewals at or above 87%' });

  const unmet = gaps.filter((g) => !g.met);
  return { eligible: state.eligible, gaps, thinnest: state.nextGate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test engine/simulate.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/simulate.js engine/simulate.test.js
git commit -m "feat(sim): promotionGaps — per-gate native-unit gaps (rolling)"
```

---

## Task 4: `promotionETA` — projection at a pace (SP)

**Files:**
- Modify: `engine/simulate.js`
- Test: `engine/simulate.test.js`

**Interfaces:**
- Consumes: `promotionGaps` (Task 3), `SP_RULES`.
- Produces: `promotionETA(rules, spInp, rate) -> { months:number|null, perGate: {gate,months|null}[], basis:'provided' }`.
- `rate = { wfypPerMonth, nopPerMonth }`. Window-roll model: `trailing_k = trailing + k·(rate − trailing/12)`; solve smallest integer `k` crossing each gate threshold. `months` = max over unmet {wfyp,nop} gates; `null` if a gate can't be reached at the given rate.

- [ ] **Step 1: Write the failing test**

```js
// append to engine/simulate.test.js
import { promotionETA } from './simulate.js';

test('promotionETA: faster pace → fewer (or equal) months than slower pace', () => {
  const slow = promotionETA(SP_RULES, SP, { wfypPerMonth: 60000, nopPerMonth: 5 });
  const fast = promotionETA(SP_RULES, SP, { wfypPerMonth: 120000, nopPerMonth: 10 });
  assert.ok(fast.months != null && slow.months != null, 'both reachable');
  assert.ok(fast.months <= slow.months, 'faster pace must not take longer');
});

test('promotionETA: pace at/below current window average never crosses → null', () => {
  // trailing avg = 600000/12 = 50000 wfyp, 40/12≈3.33 nop; a pace equal to avg makes no progress
  const r = promotionETA(SP_RULES, SP, { wfypPerMonth: 50000, nopPerMonth: 3.33 });
  assert.equal(r.months, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test engine/simulate.test.js`
Expected: FAIL — `promotionETA is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// append to engine/simulate.js
function monthsToCross(current, target, monthlyRate, windowAvg, maxK = 120) {
  if (current >= target) return 0;
  const perMonth = monthlyRate - windowAvg;   // net change to the trailing total each month
  if (perMonth <= 0) return null;              // never crosses at this pace
  const k = Math.ceil((target - current) / perMonth);
  return k <= maxK ? k : null;
}

export function promotionETA(rules, spInp, rate) {
  const { gates } = rules;
  const wfypTarget = gates.wfypMin * spInp.targetWfyp;
  const nopTarget = gates.nopMin * spInp.targetNop;
  const wfypK = monthsToCross(spInp.trailingWfyp, wfypTarget, rate.wfypPerMonth, spInp.trailingWfyp / 12);
  const nopK = monthsToCross(spInp.trailingNop, nopTarget, rate.nopPerMonth, spInp.trailingNop / 12);

  const perGate = [{ gate: 'wfyp', months: wfypK }, { gate: 'nop', months: nopK }];
  const unreachable = perGate.some((g) => g.months === null);
  const months = unreachable ? null : Math.max(...perGate.map((g) => g.months));
  return { months, perGate, basis: 'provided' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test engine/simulate.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/simulate.js engine/simulate.test.js
git commit -m "feat(sim): promotionETA — first-order rolling-window projection"
```

---

## Task 5: `crossWindowNote` — the two-window secondary readout (never summed)

**Files:**
- Modify: `engine/simulate.js`
- Test: `engine/simulate.test.js`

**Interfaces:**
- Consumes: `evaluateDSE`; `evaluateSalesProgression`.
- Produces: `crossWindowNote(design, incInputs, spRules, spInp, action) -> { incentive:{rupees}, promotion:{gate,deltaPct} }` — two separate blocks; the caller renders them tagged and NEVER adds them.
- `action = { kind:'policies', count:number }` or `{ kind:'wfyp', rupees:number }`. Represents a this-month action that also lands in the rolling window.

- [ ] **Step 1: Write the failing test**

```js
// append to engine/simulate.test.js
import { crossWindowNote } from './simulate.js';

test('crossWindowNote: an action returns two SEPARATE readouts, not one fused number', () => {
  const note = crossWindowNote(APR26, AAA634, SP_RULES, SP, { kind: 'policies', count: 4 });
  assert.ok('incentive' in note && 'promotion' in note, 'must expose both windows separately');
  assert.equal(typeof note.incentive.rupees, 'number');       // ₹ this month
  assert.equal(note.promotion.gate, 'nop');                   // rolling gate touched by policies
  assert.ok(note.promotion.deltaPct >= 0);                    // rolling NOP achievement moves up
  // the two are never combined into a single field
  assert.ok(!('total' in note) && !('combined' in note));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test engine/simulate.test.js`
Expected: FAIL — `crossWindowNote is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// append to engine/simulate.js
export function crossWindowNote(design, incInputs, spRules, spInp, action) {
  const base = evaluateDSE(design, incInputs).finalAmount;

  // incentive window: this-month ₹ impact of the action
  let incFinal = base, promo;
  if (action.kind === 'policies') {
    incFinal = evaluateDSE(design, { ...incInputs, nop: incInputs.nop + action.count }).finalAmount;
    // rolling window: same policies lift rolling NOP achievement
    const before = spInp.targetNop ? spInp.trailingNop / spInp.targetNop : 0;
    const after = spInp.targetNop ? (spInp.trailingNop + action.count) / spInp.targetNop : 0;
    promo = { gate: 'nop', deltaPct: after - before };
  } else { // 'wfyp'
    incFinal = evaluateDSE(design, { ...incInputs, wfypOthers: incInputs.wfypOthers + action.rupees }).finalAmount;
    const before = spInp.targetWfyp ? spInp.trailingWfyp / spInp.targetWfyp : 0;
    const after = spInp.targetWfyp ? (spInp.trailingWfyp + action.rupees) / spInp.targetWfyp : 0;
    promo = { gate: 'wfyp', deltaPct: after - before };
  }

  return { incentive: { rupees: incFinal - base }, promotion: promo };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test engine/simulate.test.js`
Expected: PASS. Then run the full engine suite: `npm test` → all green (existing 59 + new).

- [ ] **Step 5: Commit**

```bash
git add engine/simulate.js engine/simulate.test.js
git commit -m "feat(sim): crossWindowNote — two-window readout, never summed"
```

---

## Task 6: Server — attach `view.sim` raw inputs + parity lock

**Files:**
- Modify: `api/dse/[code].js` (attach `view.sim` after `buildDseView`, before `applyContract`)
- Modify: `api/_lib/adapt.js` (reconcile `view.sim.incentive` to contract raw inputs when a contract is present)
- Test: `test/sim-parity.test.js`

**Interfaces:**
- Produces on the view-model:
  `view.sim = { design:'apr26', incentive:{ target, wfypOthers, ulipGap, ulipFyp, persCM, persLM, nop, holdNotAchieved }, sp:{ trailingWfyp, trailingNop, targetWfyp, targetNop, persistency } | null }`
- Consumes in the browser bridge (Task 7): `VM.sim`.

- [ ] **Step 1: Write the failing parity test**

```js
// test/sim-parity.test.js
// Parity lock: the client engine at the DSE's UNCHANGED base inputs must reproduce the
// frozen contract final. If these ever diverge, the simulator is silently lying.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APR26 } from '../engine/designs/apr26.js';
import { evaluateDSE } from '../engine/incentiveEngine.js';

// AAA634 raw inputs + the frozen contract final (from pipeline/cli.py build).
const SIM_INCENTIVE = { target: 300000, wfypOthers: 6303.03, ulipGap: 550000, ulipFyp: 550000,
  persCM: 0.95415, persLM: 0.94867, nop: 1, holdNotAchieved: true };
const CONTRACT_FINAL = 5356.336356;

test('parity lock: client engine at base inputs == frozen contract final (AAA634)', () => {
  const f = evaluateDSE(APR26, SIM_INCENTIVE).finalAmount;
  assert.ok(Math.abs(f - CONTRACT_FINAL) <= 0.01, `client ₹${f} must match contract ₹${CONTRACT_FINAL}`);
});
```

- [ ] **Step 2: Run test to verify it fails or passes-for-real**

Run: `node --test test/sim-parity.test.js`
Expected: PASS if the JS engine already reconciles (it should — Steps 0–4 reconciled). If it FAILS, STOP: the JS engine and Python contract genuinely diverge — that is a real defect to surface to the user, not to paper over by editing the expected value.

- [ ] **Step 3: Attach `view.sim` in the API handler**

In `api/dse/[code].js`, locate where `buildDseView(...)` returns the `view` and `applyContract` is later applied. Immediately after the view is built (and the server already holds `incentiveInputs` and `spInputs`), add:

```js
// Raw inputs for the client-side What-If simulator (Plan surface). Same inputs the engine
// just used — so the client reproduces this exact result. SP block is null when unjoined.
view.sim = {
  design: 'apr26',
  incentive: {
    target: incentiveInputs.target, wfypOthers: incentiveInputs.wfypOthers,
    ulipGap: incentiveInputs.ulipGap, ulipFyp: incentiveInputs.ulipFyp,
    persCM: incentiveInputs.persCM, persLM: incentiveInputs.persLM,
    nop: incentiveInputs.nop, holdNotAchieved: incentiveInputs.holdNotAchieved,
  },
  sp: spInputs ? {
    trailingWfyp: spInputs.trailingWfyp, trailingNop: spInputs.trailingNop,
    targetWfyp: spInputs.targetWfyp, targetNop: spInputs.targetNop,
    persistency: spInputs.persistency,
  } : null,
};
```

> Note: use the exact local variable names for the incentive/SP inputs already present in `api/dse/[code].js` (they are passed to `buildDseView`). If a field is named differently there, map it — do not invent new pipeline fields.

- [ ] **Step 4: Reconcile `view.sim` to the contract in `adapt.js`**

In `api/_lib/adapt.js`, inside `applyContract`, after `applyIncentive`/`applySp`, override the sim raw inputs from the contract so the client reproduces the frozen final exactly:

```js
// keep the simulator's base inputs identical to what produced the frozen contract
if (view.sim && contract.incentive) {
  const inc = contract.incentive;
  view.sim.incentive = {
    target: inc.target_monthly, wfypOthers: inc.wfyp.non_ulip, ulipGap: inc.wfyp.ulip_gap,
    ulipFyp: inc.ulip.fyp, persCM: inc.persistency.cm, persLM: inc.persistency.lm,
    nop: inc.nop.count, holdNotAchieved: (inc.pifa && inc.pifa.hold_amount > 0) || false,
  };
}
if (view.sim && contract.sp) {
  const sp = contract.sp;
  view.sim.sp = {
    trailingWfyp: sp.wfyp.ytd_ach, trailingNop: sp.nop.ytd_ach,
    targetWfyp: sp.wfyp.ytd_target, targetNop: sp.nop.ytd_target,
    persistency: sp.persistency_overall,
  };
}
```

- [ ] **Step 5: Run tests + commit**

Run: `npm test`
Expected: PASS (all suites, including `sim-parity`).

```bash
git add "api/dse/[code].js" api/_lib/adapt.js test/sim-parity.test.js
git commit -m "feat(sim): expose raw sim inputs on the view-model + parity lock"
```

---

## Task 7: Browser bridge — expose `window.Sim`

**Files:**
- Modify: `index.html` (add a module script that imports the engines + solvers and assigns `window.Sim`)

**Interfaces:**
- Produces global: `window.Sim = { APR26, SP_RULES, evaluateDSE, reachTargetPaths, nextBandPaths, promotionGaps, promotionETA, crossWindowNote, ready:Promise }`.
- Consumed by `renderPlan()` (Task 8).

- [ ] **Step 1: Add the module bridge**

Immediately before the closing `</body>` (or with the other script tags), add:

```html
<script type="module">
  import { APR26 } from '/engine/designs/apr26.js';
  import { SP_RULES } from '/engine/designs/spRules.js';
  import { evaluateDSE } from '/engine/incentiveEngine.js';
  import { reachTargetPaths, nextBandPaths, promotionGaps, promotionETA, crossWindowNote } from '/engine/simulate.js';
  window.Sim = { APR26, SP_RULES, evaluateDSE, reachTargetPaths, nextBandPaths, promotionGaps, promotionETA, crossWindowNote };
  window.dispatchEvent(new Event('sim-ready'));
</script>
```

- [ ] **Step 2: Verify the bridge loads (headless)**

Run the app locally (see Task 10 for the harness). In the page context assert `window.Sim && typeof window.Sim.reachTargetPaths === 'function'`.
Expected: `true`.

> Contingency: if `/engine/*.js` is not served as static by Vercel (404 in the browser), add an `includeFiles`/route for `engine/**` in `vercel.json`, OR vendor the four modules' contents inline into the module script. Verify serving before proceeding.

- [ ] **Step 3: Commit**

```bash
git add index.html vercel.json
git commit -m "feat(sim): browser bridge exposing window.Sim"
```

---

## Task 8: UI — nav tab, `v_plan` section, goal picker

**Files:**
- Modify: `index.html` — nav (`index.html:765-770`), views (`index.html:759-763`), `renderAll` (`index.html:1097`), add `renderPlan()` near the other `render*` functions.

**Interfaces:**
- Consumes: `VM.sim`, `window.Sim`.
- Produces: `renderPlan()`; module-level `PLAN` state `{ goal:'target'|'band'|'eligible'|'eta', target:number|null, pace:'avg'|'month' }`.

- [ ] **Step 1: Add the nav tab and view section**

After the `career` nav button (`index.html:769`), add:

```html
<button class="tab" data-tab="plan" onclick="go('plan')"><svg viewBox="0 0 24 24"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="4"/></svg><span data-nav="plan">Plan</span></button>
```

After the `career` view section (`index.html:762`), add:

```html
<section class="view" data-view="plan" id="v_plan"></section>
```

- [ ] **Step 2: Wire `renderPlan` into `renderAll` and add state**

Change `renderAll` (`index.html:1097`) to include `renderPlan()`:

```js
function renderAll(){renderToday();renderPerform();renderEarnings();renderCareer();renderPlan();}
```

Add near the other module state (`var VM=null` at `index.html:783`):

```js
var PLAN={goal:'target',target:null,pace:'avg'};
```

- [ ] **Step 3: Implement the goal picker (no results yet)**

Add `renderPlan()` alongside the other render functions. Mirror the DOM-building idiom of `renderEarnings` (`index.html:1286`) for card/section markup and use `svic(name)` for icons:

```js
function planGoals(){
  return [
    { key:'target',  win:'incentive', label:'Hit a ₹ target this month' },
    { key:'band',    win:'incentive', label:'Reach the next payout band' },
    { key:'eligible',win:'promotion', label:'Get promotion-eligible' },
    { key:'eta',     win:'promotion', label:'When will I be promoted?' },
  ];
}
function planPick(k){ PLAN.goal=k; renderPlan(); }
function renderPlan(){
  var el=document.getElementById('v_plan'); if(!el) return;
  if(!VM||!VM.sim){ el.innerHTML='<div class="empty">Sign in to plan your next move.</div>'; return; }
  var goals=planGoals();
  var inc=goals.filter(function(g){return g.win==='incentive';});
  var pro=goals.filter(function(g){return g.win==='promotion' && VM.sim.sp;});
  function chip(g){ return '<button class="goalchip'+(PLAN.goal===g.key?' on':'')+'" onclick="planPick(\''+g.key+'\')">'+g.label+'</button>'; }
  var html=''
    + '<div class="plan-head"><h2>Plan</h2><p class="sub">Name a destination — see exactly what it takes.</p></div>'
    + '<div class="goalgroup"><div class="gg-tag">This month · ₹ incentive</div>'+inc.map(chip).join('')+'</div>';
  if(pro.length) html+='<div class="goalgroup"><div class="gg-tag">Rolling 12-mo · promotion</div>'+pro.map(chip).join('')+'</div>';
  html+='<div id="plan-result"></div>';
  el.innerHTML=html;
  renderPlanResult();
}
```

Add minimal CSS near the existing view styles (`.goalchip`, `.goalgroup`, `.gg-tag`, `.plan-head`) following the token system in Global Constraints (paper/maroon/gold, tabular ₹). `.gg-tag` must visually separate the two windows.

- [ ] **Step 4: Verify the picker renders (headless, AAA634)**

Drive the app, log in as AAA634, `go('plan')`, assert `#v_plan .goalgroup` count is 2 and there are 4 `.goalchip`s. No console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(plan): nav tab + goal picker (two window-tagged groups)"
```

---

## Task 9: UI — results (verdict, path cards, two-window tags, show-the-math)

**Files:**
- Modify: `index.html` — add `renderPlanResult()` and helpers.

**Interfaces:**
- Consumes: `window.Sim`, `VM.sim`, `PLAN`.
- Produces: `renderPlanResult()`.

- [ ] **Step 1: Implement result rendering per goal**

```js
function inr(x){ return '₹'+Math.round(x).toLocaleString('en-IN'); }
function effChip(e){ return '<span class="eff '+e+'">'+e+'</span>'; }

function renderPlanResult(){
  var box=document.getElementById('plan-result'); if(!box||!VM.sim) return;
  var S=window.Sim, inc=VM.sim.incentive, sp=VM.sim.sp;
  var base=S.evaluateDSE(S.APR26, inc).finalAmount;
  var html='';

  if(PLAN.goal==='target'){
    var target=PLAN.target!=null?PLAN.target:Math.ceil((base+1500)/500)*500;
    var r=S.reachTargetPaths(S.APR26, inc, target);
    html+='<div class="plan-verdict"><span class="wtag inc">This month · ₹</span>'
        + '<label>Target <input id="plan-target" type="number" value="'+target+'" onchange="PLAN.target=+this.value;renderPlanResult()"></label></div>';
    if(r.alreadySecured){ html+='<div class="card">You\'ve already secured '+inr(base)+' — set a higher target.</div>'; }
    else if(!r.paths.length){ html+='<div class="card">Even maxed, this month tops out at '+inr(r.ceiling)+'. Try a target below that.</div>'; }
    else html+=r.paths.map(function(p){
      var actLabel=p.unit==='policies'?('Sell '+p.need+' more '+(p.need===1?'policy':'policies')):('Write '+inr(p.need)+' more '+(p.lever==='ulipFyp'?'ULIP premium':'WFYP'));
      var act=p.unit==='policies'?{kind:'policies',count:p.need}:{kind:'wfyp',rupees:p.need};
      var note=sp?S.crossWindowNote(S.APR26,inc,S.SP_RULES,sp,act):null;
      return planCard(actLabel, inr(p.projectedFinal), effChip(p.effort), note);
    }).join('');
  }

  else if(PLAN.goal==='band'){
    var cliffs=S.nextBandPaths(S.APR26, inc);
    html+='<div class="plan-verdict"><span class="wtag inc">This month · ₹</span>Your highest-leverage cliffs</div>';
    html+=cliffs.map(function(c){
      var actLabel=c.label+(c.unit==='rupees'?(' ('+inr(c.need)+' more)'):(' (+'+c.need+' '+(c.need===1?'policy':'policies')+')'));
      var act=c.unit==='policies'?{kind:'policies',count:c.need}:{kind:'wfyp',rupees:c.need};
      var note=sp?S.crossWindowNote(S.APR26,inc,S.SP_RULES,sp,act):null;
      return planCard(actLabel, '+'+inr(c.deltaFinal), effChip(c.effort), note);
    }).join('') || '<div class="card">You\'re already in the top band.</div>';
  }

  else if(PLAN.goal==='eligible'){
    if(!sp){ box.innerHTML='<div class="empty">Promotion data isn\'t linked for your profile yet.</div>'; return; }
    var g=S.promotionGaps(S.SP_RULES, sp);
    html+='<div class="plan-verdict"><span class="wtag pro">Rolling 12-mo · promotion</span>'
        + (g.eligible?'You\'re eligible — hold it.':('You\'re '+g.gaps.filter(function(x){return !x.met;}).length+' gate(s) from promotion.'))+'</div>';
    html+=g.gaps.map(function(x){
      return '<div class="card gate'+(x.met?' met':'')+(x.gate===g.thinnest?' closest':'')+'">'
        + '<div class="gate-name">'+x.gate.toUpperCase()+(x.met?' ✓':'')+(x.gate===g.thinnest?' · closest':'')+'</div>'
        + '<div class="gate-note">'+x.note+'</div></div>';
    }).join('');
  }

  else if(PLAN.goal==='eta'){
    if(!sp){ box.innerHTML='<div class="empty">Promotion data isn\'t linked for your profile yet.</div>'; return; }
    var avg={ wfypPerMonth: sp.trailingWfyp/12, nopPerMonth: sp.trailingNop/12 };
    var stretch={ wfypPerMonth: (sp.trailingWfyp/12)*1.5, nopPerMonth: (sp.trailingNop/12)*1.5 };
    var rate=PLAN.pace==='month'?stretch:avg;
    var e=S.promotionETA(S.SP_RULES, sp, rate);
    html+='<div class="plan-verdict"><span class="wtag pro">Rolling 12-mo · promotion</span>'
        + (e.months==null?'At this pace the gates don\'t clear within the year.':('At this pace: about '+e.months+' month(s) to eligible.'))+'</div>';
    html+='<div class="pace-toggle"><button class="'+(PLAN.pace==='avg'?'on':'')+'" onclick="PLAN.pace=\'avg\';renderPlanResult()">Current pace</button>'
        + '<button class="'+(PLAN.pace==='month'?'on':'')+'" onclick="PLAN.pace=\'month\';renderPlanResult()">Stretch (+50%)</button></div>';
    html+='<div class="card small">Estimate: assumes renewals stay ≥87% and applies the WAS cap. Not a guarantee.</div>';
  }

  box.innerHTML=html;
}

// One path card with the primary readout + the SEPARATE, tagged secondary readout (never summed).
function planCard(action, primary, effortHtml, note){
  var secondary='';
  if(note){
    secondary='<div class="xwin">'
      + '<span class="wtag pro">rolling 12-mo · promotion</span>'
      + '+'+(note.promotion.deltaPct*100).toFixed(1)+'% toward your '+note.promotion.gate.toUpperCase()+' gate'
      + '</div>';
  }
  return '<div class="card path">'
    + '<div class="path-act">'+action+' '+effortHtml+'</div>'
    + '<div class="path-primary"><span class="wtag inc">this month · ₹</span>'+primary+'</div>'
    + secondary + '</div>';
}
```

- [ ] **Step 2: Add result CSS + i18n nav label**

Add CSS for `.plan-verdict`, `.card.path`, `.path-primary`, `.xwin`, `.wtag.inc`/`.wtag.pro`, `.eff`, `.gate.closest`, `.pace-toggle` per the token system. `.wtag.inc` and `.wtag.pro` must be visually distinct (e.g. maroon vs gold) so the two windows are never confused. Add `plan` to the i18n dict `T` used by `[data-nav]` (EN + HI), mirroring the existing nav labels.

- [ ] **Step 3: Verify each destination renders (headless, AAA634)**

Drive the app for AAA634; for each `PLAN.goal` in `['target','band','eligible','eta']` click the chip and assert: `#plan-result` non-empty, at least one `.wtag.inc` and (for target/band) one `.wtag.pro` present in SEPARATE elements, no `.card` contains both a ₹ and a % in one figure. No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(plan): goal-seek results — verdict, path cards, two-window tags"
```

---

## Task 10: Headless end-to-end verification

**Files:**
- Use existing puppeteer-core harness in the scratchpad (system Chrome). No repo files created.

**Interfaces:** none (verification only).

- [ ] **Step 1: Serve the app locally**

Run a local static+function server the repo already supports (the same way prior steps were verified headless), or `npx vercel dev` if available. Confirm `/api/dse/AAA634` returns 200 with a `sim` block.

Run: `curl -s localhost:3000/api/dse/AAA634 | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const v=JSON.parse(s);console.log(!!v.sim, v.sim&&v.sim.incentive.nop, v.sim&&!!v.sim.sp)})"`
Expected: `true 1 true`

- [ ] **Step 2: Drive the Plan surface for all 4 destinations**

With puppeteer-core + system Chrome: log in as AAA634, `go('plan')`, iterate the 4 goal chips, screenshot each, and collect `console` errors.
Expected: 0 console errors; each screenshot shows a verdict + at least one path/gate card; incentive and promotion readouts appear in separate tagged elements.

- [ ] **Step 3: Confirm the hard rule holds visually**

Assert in-page: no single element's text contains both `₹` and `%` for a fused figure; every `.xwin` carries a `.wtag.pro` and sits in its own block distinct from the `.path-primary` `.wtag.inc`.
Expected: assertion passes.

- [ ] **Step 4: Full regression**

Run: `npm test`
Expected: all suites green (existing 59 + new solver/parity tests).

- [ ] **Step 5: Final commit (if any verification tweaks were needed)**

```bash
git add -A
git commit -m "test(plan): headless verification of the What-If simulator (AAA634)"
```

---

## Self-Review

**Spec coverage:** §2 goals → Tasks 1–4; §3 mechanics → Tasks 1–5; §3.4 projection assumptions → Task 9 Step 1 (`eta` disclaimer) + Task 4; §4 result layout → Tasks 8–9; §5 plumbing → Tasks 6–7; §5.3 parity lock → Task 6; §6 testing → Tasks 1–10; §7 YAGNI → Global Constraints; hard rule → Global Constraints + Tasks 5, 9, 10 Step 3. Covered.

**Placeholder scan:** No TBD/TODO; every code step carries runnable code. UI styling steps reference the existing `renderEarnings` idiom and token system by exact anchor rather than restating CSS — acceptable in an existing codebase.

**Type consistency:** `Path`/`Cliff`/`Gap` shapes and function names (`reachTargetPaths`, `nextBandPaths`, `promotionGaps`, `promotionETA`, `crossWindowNote`) are used identically across tasks and the browser bridge. `view.sim` shape in Task 6 matches what Tasks 8–9 consume. `crossWindowNote` returns `{incentive, promotion}` consumed verbatim in `planCard`.

**Known verification gates (not assumptions):** (a) Task 6 Step 2 — whether the JS engine already reconciles to the frozen contract; if not, STOP and surface. (b) Task 7 Step 2 — whether Vercel serves `/engine/*.js`; contingency documented inline.
