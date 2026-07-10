// Pure incentive engine — no DOM, no Excel, no globals. Config in, domain object out.
//
// Role (agreed with user): the monthly workbook is the source of truth and is delivered
// fully computed. This engine does NOT replace it — it (a) reproduces the DSE payout chain
// so every number is explainable and (b) validates that a design config matches the sheet
// (regression gate) and powers marginal what-ifs for the Optimizer. Final Amount displayed
// to a DSE always comes from the sheet; `finalAmount` here is the computed check.

/** Pick the value of the highest band whose `from` <= x. Slabs must be ascending by `from`. */
function bandValue(slabs, x, key) {
  let v = slabs[0][key];
  for (const s of slabs) {
    if (x >= s.from) v = s[key];
    else break;
  }
  return v;
}

/** Persistency multiplier: slab value (or the persistency itself in the EQUAL band),
 *  raised to the growth-booster floor when current & MoM-growth qualify. */
export function persistencyMultiplier(design, persCM, persLM) {
  // No score on record (new joiner / #N/A) -> sheet defaults the multiplier to 100%.
  if (!Number.isFinite(persCM)) return design.persistency.missingMult;
  const band = bandValue(design.persistency.slabs, persCM, 'mult');
  const base = band === 'EQUAL' ? persCM : band;
  const gb = design.persistency.growthBooster;
  const qualifies = persCM >= gb.minPers && persCM - persLM >= gb.minGrowthMoM;
  return Math.max(base, qualifies ? gb.mult : 0);
}

/**
 * Reproduce the DSE-level incentive chain for one DSE.
 * @param {object} design - an IncentiveDesign config (e.g. APR26)
 * @param {object} inp - { target, wfypOthers, ulipGap, ulipFyp, persCM, persLM, nop, holdNotAchieved }
 * @returns domain object with every step + the computed final.
 */
export function evaluateDSE(design, inp) {
  const achievement = inp.target ? (inp.wfypOthers + inp.ulipGap) / inp.target : 0;

  const payoutPct = bandValue(design.achievementSlabs, achievement, 'pct');
  const payoutBase = inp.wfypOthers * payoutPct; // col L (A)

  const gridPct = bandValue(design.ulipGrid.slabs, inp.ulipFyp, 'pct');
  const payoutUlip =
    achievement >= design.ulipGrid.minAchievement ? inp.ulipFyp * gridPct : 0; // col O (B)

  const total = payoutBase + payoutUlip; // col P

  const persMult = persistencyMultiplier(design, inp.persCM, inp.persLM); // col V
  const persistencyBooster = total * persMult - total; // col W
  const postPersistency = total + persistencyBooster; // col X

  const nopMult = bandValue(design.nopMultiplier, inp.nop, 'mult'); // col Z
  const nopPayout = postPersistency * nopMult; // col AA

  const hold = inp.holdNotAchieved ? nopPayout * design.hold.pct : 0; // col AC
  const finalAmount = nopPayout - hold; // col AD

  return {
    achievement, payoutPct, payoutBase,
    gridPct, payoutUlip, total,
    persMult, persistencyBooster, postPersistency,
    nopMult, nopPayout, hold, finalAmount,
  };
}
