// Parity: the number the UI displays must equal the contract's reconciled `final` (migration Step 4).
// The adapter is what the UI renders verbatim, so testing applyContract IS the display-parity test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applyContract } from '../api/_lib/adapt.js';
import { evaluateDSE } from '../engine/incentiveEngine.js';
import { APR26 } from '../engine/designs/apr26.js';

function stubView() {
  return {
    earnings: { headline: {}, achievement: {}, credits: [], deductions: [], journey: [], recommendations: [] },
    career: { gates: {} },
    bridge: { promotionImpact: {}, incentiveImpact: { rupees: 1476 } },
    profile: {},
  };
}

// AAA634 / Lakshya — the pinned golden contract (from pipeline/cli.py build).
const AAA634 = {
  dse_id: 'AAA634',
  incentive: {
    final: 5356.336356, secured: 5356.336356, base_payout: 8502.1212, post_persistency: 10202.54544,
    target_monthly: 300000,
    wfyp: { non_ulip: 6303.03, ulip_gap: 550000, total: 556303.03, ach_pct: 1.8543434333 },
    non_ulip: { grid_pct: 0.04, payout: 252.1212 },
    ulip: { fyp: 550000, slab_pct: 0.015, gate_60pct_met: true, payout: 8250.0 },
    persistency: { cm: 0.95415, lm: 0.94867, growth: 0.00548, multiplier: 1.2, booster: 1700.4242 },
    nop: { count: 1, multiplier: 0.7, payout: 7141.781808 },
    pifa: { cadence: 'ytd', met: false, hold_pct: 0.25, hold_amount: 1785.445452 },
    recoverable: [{ lever: 'nop_multiplier', amount: 3060.76 }, { lever: 'pifa_hold', amount: 1785.45 }],
  },
  sp: {
    overall_was: 0.62712516695, eligible: false, tier: 'on_track', thinnest_gate: 'wfyp',
    // ytd_ach/ytd_target are the rolling-12m absolutes the sim remap reads; kept internally
    // consistent with ach_pct (ytd_ach / ytd_target === ach_pct).
    wfyp: { ach_pct: 0.5495002226, gate_met: false, ytd_target: 10000000, ytd_ach: 5495002.226 },
    nop: { ach_pct: 0.86, gate_met: true, ytd_target: 100, ytd_ach: 86 },
    gates: { wfyp_75: false, nop_50: true, was_100: false, persistency_87: true },
    persistency_overall: 0.95415,
  },
};

test('parity: displayed incentive == contract final (AAA634 = ₹5,356.34)', () => {
  const v = stubView();
  applyContract(v, AAA634);
  assert.equal(v.earnings.headline.finalAmount, 5356.336356);
  assert.equal(v.earnings.achievement.achievementPct, 1.8543434333);
  assert.equal(v.dataSource, 'contract-v3');
});

// Closes the parity-lock blind spot: the raw inputs the CLIENT simulator receives on the
// contract (production) path come from applyContract's remap — not the hardcoded fixture in
// sim-parity.test.js. A single wrong field in that remap would silently diverge every simulated
// path while sim-parity.test.js stayed green. Assert the remapped inputs reproduce the frozen final.
test('parity: contract-path view.sim.incentive reproduces the frozen final (AAA634 = ₹5,356.34)', () => {
  const v = stubView();
  v.sim = { design: 'apr26', incentive: {}, sp: {} }; // present so applyContract remaps it
  applyContract(v, AAA634);
  const f = evaluateDSE(APR26, v.sim.incentive).finalAmount;
  assert.ok(Math.abs(f - AAA634.incentive.final) <= 0.01,
    `client sim inputs must reproduce the contract final: got ${f}, want ${AAA634.incentive.final}`);
});

test('parity: contract-path view.sim.sp maps the rolling-12m absolutes from the contract', () => {
  const v = stubView();
  v.sim = { design: 'apr26', incentive: {}, sp: {} };
  applyContract(v, AAA634);
  assert.equal(v.sim.sp.trailingWfyp, AAA634.sp.wfyp.ytd_ach);
  assert.equal(v.sim.sp.targetWfyp, AAA634.sp.wfyp.ytd_target);
  assert.equal(v.sim.sp.trailingNop, AAA634.sp.nop.ytd_ach);
  assert.equal(v.sim.sp.targetNop, AAA634.sp.nop.ytd_target);
  assert.equal(v.sim.sp.persistency, AAA634.sp.persistency_overall);
});

test('parity: SP eligibility/gates from the contract, never annualised (AAA634 = 2/4, not eligible)', () => {
  const v = stubView();
  applyContract(v, AAA634);
  assert.equal(v.career.eligible, false);
  assert.equal(v.career.gatesCleared, 2);
  assert.equal(v.career.nextGate, 'wfyp');
  assert.equal(v.bridge.promotionImpact.alreadyEligible, false);
  assert.equal(v.profile.monthlyTarget, 300000);  // monthly, not annual
});

test('no "Annual" label leaks through the adapter journey', () => {
  const v = stubView();
  applyContract(v, AAA634);
  assert.ok(!JSON.stringify(v.earnings.journey).includes('Annual'), 'journey must not say Annual');
});

// Breadth: every generated contract's `final` flows to the display field (skips without local build).
const DIR = join(dirname(fileURLToPath(import.meta.url)), '../pipeline/data/out/dse');
test('parity across a sample of generated contracts', { skip: !existsSync(DIR) }, () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).slice(0, 50);
  let checked = 0;
  for (const f of files) {
    const c = JSON.parse(readFileSync(join(DIR, f)));
    if (!c.incentive) continue;
    const v = stubView();
    applyContract(v, c);
    assert.equal(v.earnings.headline.finalAmount, c.incentive.final, f);
    checked++;
  }
  assert.ok(checked > 0, 'expected at least one contract with an incentive block');
});
