// The Dashboard bridge — runs BOTH engines for a DSE and reports a move's genuine,
// per-DSE dual impact: "+₹ this month" (incentive) and "+X% toward promotion" (rolling SP).
// It is honest: when a move only helps one side (e.g. the DSE is already promotion-eligible),
// it says so, instead of inventing a promotion gain.

import { optimize, marginalImpact } from './optimizer.js';
import { evaluateSalesProgression } from './spEngine.js';

/** Change in promotion progress from applying `patch` to a DSE's rolling SP inputs. */
export function salesProgressionMarginal(rules, spInputs, patch) {
  const before = evaluateSalesProgression(rules, spInputs);
  const after = evaluateSalesProgression(rules, { ...spInputs, ...patch });
  const clearsGate = Object.keys(after.gates).find(g => !before.gates[g] && after.gates[g]) || null;
  return {
    deltaProgress: after.progress - before.progress,
    clearsGate,
    wasEligible: before.eligible,
    nowEligible: after.eligible,
  };
}

const pct = x => `${Math.round(x * 100)}%`;
const inr = x => `₹${Math.round(x).toLocaleString('en-IN')}`;

/**
 * @param {object} ctx - {
 *   incentiveDesign, incentiveInputs,   // for the incentive optimizer
 *   spRules, spInputs,                   // for the rolling promotion engine
 * }
 * @returns the single best move with both impacts, honestly labelled (or null if maxed out).
 */
export function buildDashboardRecommendation(ctx) {
  const { incentiveDesign, incentiveInputs, spRules, spInputs } = ctx;

  const recs = optimize(incentiveDesign, incentiveInputs);
  if (recs.length === 0) return null; // nothing left to optimise on the incentive side
  const top = recs[0];

  // Map the incentive lever onto the rolling SP window (a move made this month also
  // lands in the trailing-12-month totals).
  let spPatch = null;
  let moveLabel = null;
  let extraPolicies = null;
  if (top.lever === 'nop') {
    extraPolicies = top.extraPolicies;
    moveLabel = extraPolicies === 1 ? 'Sell one more policy'
      : `Sell ${extraPolicies} more policies`;
    spPatch = { trailingNop: spInputs.trailingNop + extraPolicies };
  } else if (top.lever === 'persistency') {
    moveLabel = 'Improve persistency';
    spPatch = { persistency: top.to };
  } else if (top.lever === 'achievement') {
    moveLabel = `Bring in ${inr(top.rupeesNeeded)} more premium`;
    spPatch = { trailingWfyp: spInputs.trailingWfyp + top.rupeesNeeded };
  } else if (top.lever === 'ulipGrid') {
    moveLabel = `Grow ULIP premium by ${inr(top.rupeesNeeded)}`;
    spPatch = { trailingWfyp: spInputs.trailingWfyp + top.rupeesNeeded };
  }

  const incentiveImpact = { rupees: top.deltaFinal, window: 'this-month' };
  const promo = spPatch
    ? salesProgressionMarginal(spRules, spInputs, spPatch)
    : { deltaProgress: 0, clearsGate: null, wasEligible: null, nowEligible: null };

  const promotionImpact = {
    window: 'rolling-12m',
    deltaProgress: promo.deltaProgress,
    clearsGate: promo.clearsGate,
    alreadyEligible: promo.wasEligible === true,
    nowEligible: promo.nowEligible,
  };

  const helpsBoth = incentiveImpact.rupees > 0.005 && promotionImpact.deltaProgress > 0.0001;

  let headline;
  if (promotionImpact.alreadyEligible) {
    headline = `${inr(incentiveImpact.rupees)} more this month — and you're already promotion-eligible, so this is pure earnings.`;
  } else if (helpsBoth) {
    const gate = promotionImpact.clearsGate ? ` (clears the ${promotionImpact.clearsGate.toUpperCase()} gate)` : '';
    headline = `${inr(incentiveImpact.rupees)} more this month · +${pct(promotionImpact.deltaProgress)} toward promotion${gate}.`;
  } else {
    headline = `${inr(incentiveImpact.rupees)} more this month · no change to your promotion from this move.`;
  }

  return {
    move: { label: moveLabel, lever: top.lever, extraPolicies, effort: top.effort },
    incentiveImpact,
    promotionImpact,
    helpsBoth,
    headline,
  };
}
