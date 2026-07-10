// Incentive Design — April 2026. Config, not code.
// Every value here is what the business changes month-to-month; the engine shape stays fixed.
// Decoded from & cross-validated against "Incentive Sheet Apr.xlsx" + "DSE Incentive Design - Apr'26.pdf".
// Slabs are sorted ascending by `from`; the engine selects the highest band whose `from` <= value.

export const APR26 = {
  version: '2026-04',
  channel: 'DM',

  // WFYP achievement % -> non-ULIP payout % (workbook col K / design p.6)
  achievementSlabs: [
    { from: 0.00, pct: 0.000 },
    { from: 0.60, pct: 0.005 },
    { from: 0.80, pct: 0.010 },
    { from: 1.00, pct: 0.020 },
    { from: 1.25, pct: 0.030 },
    { from: 1.75, pct: 0.040 },
    { from: 2.00, pct: 0.050 },
    { from: 2.50, pct: 0.100 },
  ],

  // ULIP FYP -> grid % (workbook col N). Payout only credited when achievement >= minAchievement.
  ulipGrid: {
    minAchievement: 0.60,
    slabs: [
      { from: 0,       pct: 0.000 },
      { from: 50000,   pct: 0.005 },
      { from: 500000,  pct: 0.015 },
      { from: 1000000, pct: 0.020 },
      { from: 2500000, pct: 0.040 },
      { from: 3500000, pct: 0.060 },
    ],
  },

  // Persistency multiplier (workbook cols T/U/V). In the 0.60–0.86 band the multiplier
  // EQUALS the DSE's 13-month persistency value itself (confirmed with user).
  persistency: {
    slabs: [
      { from: 0.00, mult: 0.50 },
      { from: 0.60, mult: 'EQUAL' },
      { from: 0.86, mult: 1.00 },
      { from: 0.89, mult: 1.10 },
      { from: 0.92, mult: 1.20 },
    ],
    growthBooster: { minPers: 0.80, minGrowthMoM: 0.02, mult: 1.00 },
    // No persistency score on record (e.g. new joiner, #N/A) -> sheet's IFERROR(...,100%) fallback.
    missingMult: 1.00,
  },

  // NOP count -> multiplier (workbook col Z)
  nopMultiplier: [
    { from: 0, mult: 0.70 },
    { from: 2, mult: 0.90 },
    { from: 4, mult: 1.00 },
    { from: 8, mult: 1.20 },
  ],

  // 25% held when YTD PIFA criteria is "Not Achieved" (workbook cols AB/AC)
  hold: { pct: 0.25 },

  // Stage 1 — per-policy credit rules (workbook Summary Sheet cols BN/BO/BR, design p.2)
  stage1: {
    ftTiers: { half: 0.50, threeQuarter: 0.75 }, // full = 1.0 (no reduction); zero handled by flag
    nopQualify: { protectionMinFYP: 10000, othersMinFYP: 15000 }, // combos/add-ons excluded upstream
  },
};
