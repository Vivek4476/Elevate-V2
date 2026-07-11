// Domain-object layer — turns a DSE's inputs into the clean EarningsStatement the UI consumes.
// The UI never sees a slab or a formula; it renders these objects. Invariant: this builder
// invents no numbers — every figure traces back to evaluateDSE, and credits + deductions
// reconstruct the engine's finalAmount exactly.

import { evaluateDSE } from './incentiveEngine.js';
import { optimize } from './optimizer.js';

/**
 * @param {object} design - IncentiveDesign config (e.g. APR26)
 * @param {object} inputs - DSE inputs (see evaluateDSE)
 * @param {object} [dse]  - optional passthrough meta (name, grade, id…) for the UI
 * @returns {object} EarningsStatement domain object
 */
export function buildEarningsStatement(design, inputs, dse = {}) {
  const e = evaluateDSE(design, inputs);

  // Credits = the building blocks up to the 100% (pre-NOP-multiplier, pre-hold) baseline.
  // Their sum equals engine.postPersistency.
  const credits = [
    { key: 'payoutBase',        label: 'WFYP payout (base)',  amount: e.payoutBase },
    { key: 'payoutUlip',        label: 'ULIP + GAP payout',   amount: e.payoutUlip },
    { key: 'persistencyBooster',label: 'Persistency booster', amount: e.persistencyBooster },
  ].filter(c => c.amount !== 0);

  // Deductions = signed adjustments from that baseline down to the final.
  // NOP multiplier is signed vs the 100% tier (negative = drag, positive = bonus at 120%).
  const deductions = [];
  const nopAdjust = e.nopPayout - e.postPersistency;
  if (Math.abs(nopAdjust) > 0.005) {
    deductions.push({
      key: 'nopMultiplier',
      label: 'NOP multiplier',
      amount: nopAdjust,
      recoverable: nopAdjust < 0, // a drag can be recovered by selling more policies
    });
  }
  if (e.hold > 0.005) {
    deductions.push({
      key: 'pifaHold',
      label: 'PIFA hold (25%)',
      amount: -e.hold,
      recoverable: true, // released when YTD PIFA is achieved
    });
  }

  // Money currently forfeited but recoverable (reach the 100% NOP tier + clear the hold).
  const onTheTable = e.postPersistency > e.finalAmount ? e.postPersistency - e.finalAmount : 0;

  const journey = [
    { key: 'target',        label: 'Monthly target',   value: inputs.target },
    { key: 'achievement',   label: 'Achievement',      value: e.achievement, running: e.total },
    { key: 'payoutBase',    label: 'WFYP payout',      amount: e.payoutBase, running: e.payoutBase },
    { key: 'payoutUlip',    label: '+ ULIP slab',      amount: e.payoutUlip, running: e.total },
    { key: 'persistency',   label: '× Persistency',    mult: e.persMult,     running: e.postPersistency },
    { key: 'nopMultiplier', label: '× NOP multiplier', mult: e.nopMult,      running: e.nopPayout },
  ];
  if (e.hold > 0.005) {
    journey.push({ key: 'hold', label: 'PIFA hold', amount: -e.hold, running: e.finalAmount });
  }
  journey.push({ key: 'final', label: 'Final incentive', running: e.finalAmount });

  return {
    dse,
    headline: {
      finalAmount: e.finalAmount,
      baseline: e.postPersistency, // the 100%-tier, no-hold gross
      onTheTable,
    },
    achievement: {
      target: inputs.target,
      wfypOthers: inputs.wfypOthers,
      ulipGap: inputs.ulipGap,
      ulipFyp: inputs.ulipFyp,
      achievementPct: e.achievement,
      payoutPct: e.payoutPct,
      nop: inputs.nop,
      persCM: inputs.persCM,
      persMult: e.persMult,
      nopMult: e.nopMult,
      hasHold: e.hold > 0.005,
    },
    credits,
    deductions,
    journey,
    recommendations: optimize(design, inputs),
  };
}
