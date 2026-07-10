// Income Optimizer — pure marginal math over the incentive engine.
// Each lever is "distance to the next threshold": perturb one input, re-evaluate,
// measure the change in Final Amount. Because it re-uses evaluateDSE, the what-if
// numbers always agree with the design's own slabs.

import { evaluateDSE } from './incentiveEngine.js';

/** Change in Final Amount from applying `patch` (partial inputs) to a DSE's current state. */
export function marginalImpact(design, inputs, patch) {
  const base = evaluateDSE(design, inputs).finalAmount;
  const next = evaluateDSE(design, { ...inputs, ...patch }).finalAmount;
  return next - base;
}

/** The next band boundary strictly above x, or null if x is already in the top band.
 *  `bands` are ascending by `from`. */
export function nextThreshold(bands, x) {
  for (const b of bands) if (b.from > x) return b.from;
  return null;
}

function effortForPolicies(n) {
  return n <= 1 ? 'easy' : n <= 3 ? 'medium' : 'hard';
}

function effortForRupees(x) {
  return x <= 100000 ? 'medium' : 'hard';
}

/**
 * Ranked recommendations for a DSE, highest ₹ impact first.
 * v1 levers: NOP count and persistency band. (Achievement-slab and ULIP-grid
 * rupee levers are the next increment.)
 */
export function optimize(design, inputs) {
  const recs = [];

  // NOP lever — reach the next multiplier tier.
  const nopTo = nextThreshold(design.nopMultiplier, inputs.nop);
  if (nopTo != null) {
    const extra = nopTo - inputs.nop;
    recs.push({
      lever: 'nop',
      from: inputs.nop,
      to: nopTo,
      extraPolicies: extra,
      deltaFinal: marginalImpact(design, inputs, { nop: nopTo }),
      effort: effortForPolicies(extra),
    });
  }

  // Achievement-slab lever — extra credited WFYP to reach the next payout band.
  const credited = inputs.wfypOthers + inputs.ulipGap;
  const achNow = inputs.target ? credited / inputs.target : 0;
  const achTo = nextThreshold(design.achievementSlabs, achNow);
  if (achTo != null && inputs.target) {
    const rupeesNeeded = achTo * inputs.target - credited;
    if (rupeesNeeded > 0) {
      recs.push({
        lever: 'achievement',
        to: achTo,
        rupeesNeeded,
        deltaFinal: marginalImpact(design, inputs, { wfypOthers: inputs.wfypOthers + rupeesNeeded }),
        effort: effortForRupees(rupeesNeeded),
      });
    }
  }

  // ULIP-grid lever — extra ULIP FYP to reach the next grid slab (adds to both FYP and achievement).
  const ulipTo = nextThreshold(design.ulipGrid.slabs, inputs.ulipFyp);
  if (ulipTo != null) {
    const rupeesNeeded = ulipTo - inputs.ulipFyp;
    if (rupeesNeeded > 0) {
      recs.push({
        lever: 'ulipGrid',
        to: ulipTo,
        rupeesNeeded,
        deltaFinal: marginalImpact(design, inputs, {
          ulipFyp: inputs.ulipFyp + rupeesNeeded,
          ulipGap: inputs.ulipGap + rupeesNeeded,
        }),
        effort: effortForRupees(rupeesNeeded),
      });
    }
  }

  // Persistency lever — reach the next multiplier band (skip when unscored or already top).
  if (Number.isFinite(inputs.persCM)) {
    const persTo = nextThreshold(design.persistency.slabs, inputs.persCM);
    if (persTo != null) {
      recs.push({
        lever: 'persistency',
        from: inputs.persCM,
        to: persTo,
        deltaFinal: marginalImpact(design, inputs, { persCM: persTo }),
        effort: 'medium',
      });
    }
  }

  // Rank by ROI (₹ per unit of effort) so easy, high-value wins surface first — the right
  // default for "your best move". Raw ₹ is still on each rec (deltaFinal) for a value-sorted view.
  const EFFORT_WEIGHT = { easy: 1, medium: 4, hard: 12 };
  const roi = r => r.deltaFinal / EFFORT_WEIGHT[r.effort];
  return recs
    .filter(r => r.deltaFinal > 0.005)
    .sort((a, b) => roi(b) - roi(a));
}
