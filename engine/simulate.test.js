import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APR26 } from './designs/apr26.js';
import { evaluateDSE } from './incentiveEngine.js';
import { reachTargetPaths } from './simulate.js';

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
