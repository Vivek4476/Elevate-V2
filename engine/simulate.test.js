import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APR26 } from './designs/apr26.js';
import { evaluateDSE } from './incentiveEngine.js';
import { reachTargetPaths, nextBandPaths, promotionGaps, promotionETA, crossWindowNote } from './simulate.js';
import { SP_RULES } from './designs/spRules.js';

// AAA634 base inputs (derived from the pinned golden contract).
const AAA634 = {
  target: 300000, wfypOthers: 6303.03, ulipGap: 550000, ulipFyp: 550000,
  persCM: 0.95415, persLM: 0.94867, nop: 1, holdNotAchieved: true,
};
const baseFinal = () => evaluateDSE(APR26, AAA634).finalAmount;

test('reachTargetPaths: target below secured → alreadySecured, no paths', () => {
  const r = reachTargetPaths(APR26, AAA634, baseFinal() - 100);
  assert.equal(r.alreadySecured, true);
  assert.deepEqual(r.paths, []);
});

test('reachTargetPaths: each path actually reaches the target and is minimal', () => {
  const target = baseFinal() + 1500;
  const r = reachTargetPaths(APR26, AAA634, target);
  assert.ok(r.paths.length > 0, 'expected at least one path');
  for (const p of r.paths) {
    // the recommended push reaches the target
    assert.ok(p.projectedFinal >= target - 0.01, `${p.lever} should reach target`);
    // one step less than recommended does NOT reach it (minimality)
    if (p.lever === 'nop') {
      const less = evaluateDSE(APR26, { ...AAA634, nop: AAA634.nop + p.need - 1 }).finalAmount;
      assert.ok(less < target, 'nop path must be minimal');
    } else {
      const key = p.lever;
      const patch = key === 'ulipFyp'
        ? { ulipFyp: AAA634.ulipFyp + p.need - 1, ulipGap: AAA634.ulipGap + p.need - 1 }
        : { [key]: AAA634[key] + p.need - 1 };
      const less = evaluateDSE(APR26, { ...AAA634, ...patch }).finalAmount;
      assert.ok(less < target + 0.01, 'rupee path must be near-minimal');
    }
  }
});

test('nextBandPaths: AAA634 next achievement cliff is the 2.00 slab, delta positive', () => {
  const cliffs = nextBandPaths(APR26, AAA634);
  const ach = cliffs.find((c) => c.lever === 'achievement');
  assert.ok(ach, 'expected an achievement cliff');
  assert.equal(ach.to, 2.00);              // current ach 1.854 → next slab from=2.00
  assert.ok(ach.deltaFinal > 0);
  // reaching exactly the cliff lifts achievement to >= 2.00
  const credited = AAA634.wfypOthers + AAA634.ulipGap + ach.need;
  assert.ok(credited / AAA634.target >= 2.00 - 1e-9);
});

test('nextBandPaths: AAA634 next NOP tier is 2 (from count 1), delta positive', () => {
  const cliffs = nextBandPaths(APR26, AAA634);
  const nop = cliffs.find((c) => c.lever === 'nop');
  assert.equal(nop.to, 2);
  assert.equal(nop.need, 1);
  assert.ok(nop.deltaFinal > 0);
});

// Synthetic rolling inputs with round numbers so gaps are hand-checkable.
// wfyp: 60% of target (needs 75%) ; nop: 40% (needs 50%) ; persistency below 87%.
const SP = { trailingWfyp: 600000, targetWfyp: 1000000, trailingNop: 40, targetNop: 100, persistency: 0.80 };

test('promotionGaps: WFYP gap = ₹ to reach 75% of target', () => {
  const r = promotionGaps(SP_RULES, SP);
  const g = r.gaps.find((x) => x.gate === 'wfyp');
  assert.equal(g.met, false);
  assert.equal(g.unit, 'rupees');
  assert.equal(g.need, 150000);   // 0.75*1_000_000 - 600_000
});

test('promotionGaps: NOP gap = policies to reach 50% of target', () => {
  const r = promotionGaps(SP_RULES, SP);
  const g = r.gaps.find((x) => x.gate === 'nop');
  assert.equal(g.unit, 'policies');
  assert.equal(g.need, 10);       // ceil(0.50*100 - 40)
});

test('promotionGaps: persistency gate framed as quality, not additive', () => {
  const r = promotionGaps(SP_RULES, SP);
  const g = r.gaps.find((x) => x.gate === 'persistency');
  assert.equal(g.unit, 'quality');
  assert.equal(g.met, false);
});

test('promotionETA: faster pace → fewer (or equal) months than slower pace', () => {
  const slow = promotionETA(SP_RULES, SP, { wfypPerMonth: 60000, nopPerMonth: 5 });
  const fast = promotionETA(SP_RULES, SP, { wfypPerMonth: 120000, nopPerMonth: 10 });
  assert.ok(fast.months != null && slow.months != null, 'both reachable');
  assert.ok(fast.months <= slow.months, 'faster pace must not take longer');
});

test('promotionETA: pace at/below current window average never crosses → null', () => {
  // trailing avg = 600000/12 = 50000 wfyp, 40/12≈3.33 nop; a pace equal to avg makes no progress
  const r = promotionETA(SP_RULES, SP, { wfypPerMonth: 50000, nopPerMonth: 3.33 });
  assert.equal(r.months, null);
});

test('crossWindowNote: an action returns two SEPARATE readouts, not one fused number', () => {
  const note = crossWindowNote(APR26, AAA634, SP, { kind: 'policies', count: 4 });
  assert.ok('incentive' in note && 'promotion' in note, 'must expose both windows separately');
  assert.equal(typeof note.incentive.rupees, 'number');       // ₹ this month
  assert.equal(note.promotion.gate, 'nop');                   // rolling gate touched by policies
  assert.ok(note.promotion.deltaPct >= 0);                    // rolling NOP achievement moves up
  // the two are never combined into a single field
  assert.ok(!('total' in note) && !('combined' in note));
});
