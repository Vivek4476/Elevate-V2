// Facade — the single call the app makes. Composes the whole engine for one DSE:
// Stage-1 attribution + the Earnings Statement + the Sales-Progression state + the
// honest dual-impact Dashboard recommendation. Everything below it is pure and tested.

import { buildEarningsStatement } from './statement.js';
import { evaluateSalesProgression } from './spEngine.js';
import { buildDashboardRecommendation } from './bridge.js';
import { attributePolicies } from './stage1.js';

/**
 * @param {object} args
 * @param {object} args.designs   - incentive design config (e.g. APR26)
 * @param {object} args.spRules   - sales-progression rules (e.g. SP_RULES)
 * @param {object} args.incentiveInputs - this-month DSE inputs (see evaluateDSE)
 * @param {object} args.spInputs        - rolling-12m DSE inputs (see evaluateSalesProgression)
 * @param {object[]} [args.policies]    - this DSE's policy rows (for Stage-1 attribution)
 * @param {object} [args.dse]           - passthrough meta (name, id, grade…)
 * @returns {object} view-model: { dse, earnings, career, bridge, attribution }
 */
export function buildDseView({ designs, spRules, incentiveInputs, spInputs, policies = null, dse = {} }) {
  return {
    dse,
    earnings: buildEarningsStatement(designs, incentiveInputs, dse),
    career: evaluateSalesProgression(spRules, spInputs),
    bridge: buildDashboardRecommendation({ incentiveDesign: designs, incentiveInputs, spRules, spInputs }),
    attribution: policies ? attributePolicies(designs, policies) : null,
  };
}
