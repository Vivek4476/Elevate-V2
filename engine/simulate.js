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
