// Pure goal-seek solvers over the existing pure engines. No DOM, no globals, no network.
// Forward-scan / bisection only — never algebraic inversion. Incentive (this-month ₹) and
// SP (rolling-12mo) logic stay in separate functions and are NEVER summed together.
import { evaluateDSE } from './incentiveEngine.js';
import { evaluateSalesProgression } from './spEngine.js';

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

  return { eligible: state.eligible, gaps, thinnest: state.nextGate };
}

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
