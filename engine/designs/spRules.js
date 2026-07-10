// Sales-Progression (promotion) rules — the four gates, on a rolling trailing-12-month window.
// Kept as config (like the incentive design) though these change far less often.
// This is a SEPARATE engine from the incentive engine — SP numbers (rolling %, promotion)
// must never mix with incentive numbers (this-month, ₹).

export const SP_RULES = {
  gates: {
    wfypMin: 0.75,          // WFYP achievement >= 75% of annual grade target
    nopMin: 0.50,           // NOP achievement >= 50%
    wasMin: 1.00,           // Overall WAS strictly > 100%
    persistencyMin: 0.87,   // default; a grade's own threshold overrides
  },
  was: {
    wfypWeight: 0.75,
    nopWeight: 0.25,
    cap: 1.50,              // each component capped at 150%
  },
  // progress-to-eligibility weighting (how "close" a DSE is), 0..1
  progressWeights: { wfyp: 0.25, nop: 0.25, was: 0.30, persistency: 0.20 },
};
