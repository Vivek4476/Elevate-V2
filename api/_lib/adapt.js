// Contract → view-model adapter (migration Step 3).
//
// The canonical per-DSE contract (Python pipeline, reconciled to the sheet) is the source of truth.
// This maps its `incentive` (monthly) and `sp` (rolling-12m) blocks onto the exact shape the
// existing UI already renders — so the screens keep working, just from correct data. It does NOT
// redesign anything. Fields the contract doesn't carry yet (recommendations, the 12-mo perform
// series, rank) are left as the JS scaffold produced them (superseded in later migration steps).

const near = (a, b = 0.005) => Math.abs(a) > b;

function applyIncentive(view, inc) {
  const E = view.earnings;
  if (!E) return;
  const recoverableTotal = (inc.recoverable || []).reduce((s, r) => s + (r.amount || 0), 0);

  E.headline.finalAmount = inc.final;
  E.headline.baseline = inc.post_persistency;        // 100%-tier, pre-NOP, pre-hold gross
  E.headline.onTheTable = recoverableTotal || Math.max(0, inc.post_persistency - inc.final);

  Object.assign(E.achievement, {
    target: inc.target_monthly,
    wfypOthers: inc.wfyp.non_ulip,
    ulipGap: inc.wfyp.ulip_gap,
    ulipFyp: inc.ulip.fyp,
    achievementPct: inc.wfyp.ach_pct,
    payoutPct: inc.non_ulip.grid_pct,
    nop: inc.nop.count,
    persCM: inc.persistency.cm,
    persMult: inc.persistency.multiplier,
    nopMult: inc.nop.multiplier,
    hasHold: near(inc.pifa.hold_amount || 0),
  });

  E.credits = [
    { key: 'payoutBase', label: 'WFYP payout (base)', amount: inc.non_ulip.payout },
    { key: 'payoutUlip', label: 'ULIP + GAP payout', amount: inc.ulip.payout },
    { key: 'persistencyBooster', label: 'Persistency booster', amount: inc.persistency.booster },
  ].filter((c) => near(c.amount));

  E.deductions = [];
  const nopAdjust = inc.nop.payout - inc.post_persistency;   // negative = drag vs the 100% tier
  if (near(nopAdjust)) E.deductions.push({ key: 'nopMultiplier', label: 'NOP multiplier', amount: nopAdjust, recoverable: nopAdjust < 0 });
  if (near(inc.pifa.hold_amount)) E.deductions.push({ key: 'pifaHold', label: 'PIFA hold (25%)', amount: -inc.pifa.hold_amount, recoverable: true });

  E.journey = [
    { key: 'target', label: 'Monthly target', value: inc.target_monthly },
    { key: 'achievement', label: 'Achievement', value: inc.wfyp.ach_pct, running: inc.base_payout },
    { key: 'payoutBase', label: 'WFYP payout', amount: inc.non_ulip.payout, running: inc.non_ulip.payout },
    { key: 'payoutUlip', label: '+ ULIP slab', amount: inc.ulip.payout, running: inc.base_payout },
    { key: 'persistency', label: '× Persistency', mult: inc.persistency.multiplier, running: inc.post_persistency },
    { key: 'nopMultiplier', label: '× NOP multiplier', mult: inc.nop.multiplier, running: inc.nop.payout },
  ];
  if (near(inc.pifa.hold_amount)) E.journey.push({ key: 'hold', label: 'PIFA hold', amount: -inc.pifa.hold_amount, running: inc.final });
  E.journey.push({ key: 'final', label: 'Final incentive', running: inc.final });

  // contract-accurate ranked moves (Step 10 decision layer) supersede the JS optimizer
  if (Array.isArray(inc.recommendations) && inc.recommendations.length) {
    E.recommendations = inc.recommendations;
  }

  if (view.profile) {
    view.profile.monthlyTarget = inc.target_monthly;
    const ulip = inc.ulip.fyp || 0, trad = inc.wfyp.non_ulip || 0;
    view.profile.productMix = { ulip, trad, ulipPct: (ulip + trad) ? ulip / (ulip + trad) : 0 };
    if (inc.persistency.cm != null && inc.persistency.lm != null) {
      view.profile.persTrend = { cm: inc.persistency.cm, lm: inc.persistency.lm, delta: inc.persistency.cm - inc.persistency.lm };
    }
  }
}

function applySp(view, sp) {
  const C = view.career;
  if (C) {
    C.wfypAch = sp.wfyp.ach_pct;
    C.nopAch = sp.nop.ach_pct;
    C.was = sp.overall_was;
    C.gates = { wfyp: sp.gates.wfyp_75, nop: sp.gates.nop_50, was: sp.gates.was_100, persistency: sp.gates.persistency_87 };
    C.gatesCleared = Object.values(C.gates).filter(Boolean).length;
    C.eligible = sp.eligible;
    C.progress = C.gatesCleared / 4;
    C.persistencyValue = sp.persistency_overall;
    C.persistencyThreshold = 0.87;
    C.persistencyExempt = false;
    C.nextGate = sp.thinnest_gate;   // 'wfyp' | 'nop' | 'was' | 'persistency' | null
    C.tier = sp.tier;
    C.bindingConstraint = sp.binding_constraint;
  }
  // keep Today / bridge consistent with the corrected eligibility (no fused numbers)
  if (view.bridge && view.bridge.promotionImpact) {
    view.bridge.promotionImpact.alreadyEligible = sp.eligible;
    view.bridge.promotionImpact.nowEligible = sp.eligible;
    if (!sp.eligible) {
      const rup = (view.bridge.incentiveImpact && view.bridge.incentiveImpact.rupees) || 0;
      const cleared = C ? C.gatesCleared : Object.values(sp.gates).filter(Boolean).length;
      view.bridge.headline = `₹${Math.round(rup).toLocaleString('en-IN')} more this month — and ${cleared}/4 promotion gates cleared. Keep pushing.`;
    }
  }
}

export function applyContract(view, contract) {
  if (!contract) return view;
  if (contract.incentive) applyIncentive(view, contract.incentive);
  if (contract.sp) applySp(view, contract.sp);
  view.dataSource = 'contract-v3';
  return view;
}
