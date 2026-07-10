// Sales-Progression engine — pure, DOM-free. Evaluates the four promotion gates on a
// DSE's rolling trailing-12-month totals. SEPARATE from the incentive engine by design.

const clampCap = (x, cap) => Math.min(x, cap);

/**
 * @param {object} rules - SP_RULES config
 * @param {object} inp - {
 *   trailingWfyp, trailingNop,        // rolling 12-month totals
 *   targetWfyp, targetNop,            // annual grade targets
 *   persistency,                      // number, or 'NA' (new joiner => exempt)
 *   persistencyThreshold,             // grade threshold (defaults to rules.gates.persistencyMin)
 * }
 */
export function evaluateSalesProgression(rules, inp) {
  const { gates, was, progressWeights } = rules;
  const thr = inp.persistencyThreshold ?? gates.persistencyMin;

  const wfypAch = inp.targetWfyp ? inp.trailingWfyp / inp.targetWfyp : 0;
  const nopAch = inp.targetNop ? inp.trailingNop / inp.targetNop : 0;

  const wasScore =
    clampCap(wfypAch, was.cap) * was.wfypWeight +
    clampCap(nopAch, was.cap) * was.nopWeight;

  const persistencyExempt = inp.persistency === 'NA' || inp.persistency == null;
  const persistencyValue = persistencyExempt ? null : inp.persistency;

  const gateStatus = {
    wfyp: wfypAch >= gates.wfypMin,
    nop: nopAch >= gates.nopMin,
    was: wasScore > gates.wasMin,
    persistency: persistencyExempt ? true : persistencyValue >= thr,
  };
  const eligible = gateStatus.wfyp && gateStatus.nop && gateStatus.was && gateStatus.persistency;
  const gatesCleared = Object.values(gateStatus).filter(Boolean).length;

  // Progress-to-eligibility: how far each gate is toward its threshold, weighted.
  // Clamped to [0,1] — trailing WFYP can be negative (clawbacks), which would otherwise
  // push a component below zero.
  const progress = Math.max(0, Math.min(1,
    Math.min(wfypAch / gates.wfypMin, 1) * progressWeights.wfyp +
    Math.min(nopAch / gates.nopMin, 1) * progressWeights.nop +
    Math.min(wasScore / gates.wasMin, 1) * progressWeights.was +
    (gateStatus.persistency ? 1 : Math.min(persistencyValue / thr, 1)) * progressWeights.persistency));

  // Which gate to chase next (first unmet, in gate order).
  const nextGate = eligible
    ? null
    : (!gateStatus.wfyp ? 'wfyp'
      : !gateStatus.nop ? 'nop'
      : !gateStatus.was ? 'was'
      : 'persistency');

  return {
    wfypAch, nopAch, was: wasScore,
    persistencyValue, persistencyExempt, persistencyThreshold: thr,
    gates: gateStatus, gatesCleared, eligible,
    progress, nextGate,
  };
}
