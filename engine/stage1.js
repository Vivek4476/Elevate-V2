// Stage 1 — per-policy credit attribution (Summary Sheet). Turns raw policy rows into their
// WFYP credit and rolls them up into "where the money came from". Reproduces the sheet's
// per-policy columns (BN/BO/BR) so a single policy's credit is explainable.

/**
 * Per-policy WFYP credit (workbook BN), WFYP-post-S2S (BO) and NOP qualification (BR).
 * @param {object} design - IncentiveDesign config (uses design.stage1)
 * @param {object} p - {
 *   fyp, adjFyp, wfypPct,        // FYP, Adjusted FYP, resolved product credit % (BM)
 *   s2sRate,                     // 0.5 for S2S else 1
 *   ftZero, ft50, ft75, differential,  // booleans: FT/churn credit-tier flags
 *   protection,                  // 'Protection' | 'Others'
 *   category, ulipGap, product,  // attribution dimensions (passthrough)
 * }
 */
export function creditForPolicy(design, p) {
  const { half, threeQuarter } = design.stage1.ftTiers;
  const nq = design.stage1.nopQualify;

  let wfyp;
  if (p.ftZero) {
    wfyp = 0;                                            // ABCD via FT/Churn — zero credit
  } else if (p.differential && p.ft50) {
    wfyp = p.adjFyp * p.wfypPct * half;                  // differential ULIP, 50% on APE
  } else if (p.differential && p.ft75) {
    wfyp = p.adjFyp * p.wfypPct * threeQuarter;
  } else if (p.ft50) {
    wfyp = p.fyp * half * p.wfypPct;
  } else if (p.ft75) {
    wfyp = p.fyp * threeQuarter * p.wfypPct;
  } else {
    wfyp = p.fyp * p.wfypPct;                            // full credit
  }

  const wfypPostS2S = wfyp * p.s2sRate;
  const nopQualifies =
    (p.protection === 'Protection' && p.fyp >= nq.protectionMinFYP) ||
    (p.protection === 'Others' && p.fyp >= nq.othersMinFYP);

  return { wfyp, wfypPostS2S, nopQualifies, product: p.product, category: p.category, ulipGap: p.ulipGap };
}

const isUlip = ulipGap => /ULIP/i.test(String(ulipGap)) && !/Non/i.test(String(ulipGap));

/**
 * Aggregate a DSE's policies into the attribution the Earnings Statement drills into.
 * @returns { totalWfyp, wfypUlipGap, wfypOthers, nop, byCategory[], byProduct[] }
 *   — wfypOthers / wfypUlipGap reconcile to the DSE sheet's H / I inputs.
 */
export function attributePolicies(design, policies) {
  const credits = policies.map(p => creditForPolicy(design, p));

  let totalWfyp = 0, wfypUlipGap = 0, wfypOthers = 0, nop = 0;
  const catMap = new Map();
  const prodMap = new Map();
  for (const c of credits) {
    totalWfyp += c.wfypPostS2S;
    if (isUlip(c.ulipGap)) wfypUlipGap += c.wfypPostS2S;
    else wfypOthers += c.wfypPostS2S;
    if (c.nopQualifies) nop += 1;
    catMap.set(c.category, (catMap.get(c.category) || 0) + c.wfypPostS2S);
    prodMap.set(c.product, (prodMap.get(c.product) || 0) + c.wfypPostS2S);
  }
  const toSorted = m => [...m.entries()]
    .map(([key, wfyp]) => ({ key, wfyp, share: totalWfyp ? wfyp / totalWfyp : 0 }))
    .sort((a, b) => b.wfyp - a.wfyp);

  return { totalWfyp, wfypUlipGap, wfypOthers, nop, byCategory: toSorted(catMap), byProduct: toSorted(prodMap) };
}
