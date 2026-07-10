import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creditForPolicy, attributePolicies } from './stage1.js';
import { APR26 } from './designs/apr26.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/policies-apr26.json', import.meta.url)));
const naFalse = v => v !== 'NA' && v != null;
function policyFrom(row) {
  return {
    fyp: Number(row.fyp), adjFyp: Number(row.adjFyp), wfypPct: Number(row.wfypPct),
    s2sRate: Number(row.s2sRate ?? 1),
    ftZero: naFalse(row.ftZero), ft50: naFalse(row.ft50), ft75: naFalse(row.ft75),
    differential: naFalse(row.differential),
    protection: row.protection, category: row.productCategory, ulipGap: row.ulipGap, product: row.product,
  };
}
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;

// build a policy with sensible defaults
function pol(o = {}) {
  return { fyp: 100000, adjFyp: 80000, wfypPct: 0.5, s2sRate: 1,
    ftZero: false, ft50: false, ft75: false, differential: false,
    protection: 'Others', category: 'C', ulipGap: 'A. Non-ULIP', product: 'P', ...o };
}

test('credit tiers: full, zero, 50%, 75%, differential-50, differential-75', () => {
  assert.equal(creditForPolicy(APR26, pol()).wfyp, 50000);                                  // full: 100k*0.5
  assert.equal(creditForPolicy(APR26, pol({ ftZero: true })).wfyp, 0);                       // zero
  assert.equal(creditForPolicy(APR26, pol({ ft50: true })).wfyp, 25000);                     // 100k*0.5*0.5
  assert.equal(creditForPolicy(APR26, pol({ ft75: true })).wfyp, 37500);                     // 100k*0.75*0.5
  assert.equal(creditForPolicy(APR26, pol({ differential: true, ft50: true })).wfyp, 20000); // adj 80k*0.5*0.5
  assert.equal(creditForPolicy(APR26, pol({ differential: true, ft75: true })).wfyp, 30000); // adj 80k*0.5*0.75
});

test('S2S halves the credit (WFYP post S2S)', () => {
  const c = creditForPolicy(APR26, pol({ s2sRate: 0.5 }));
  assert.equal(c.wfyp, 50000);
  assert.equal(c.wfypPostS2S, 25000);
});

test('NOP qualifies only above the FYP floor (Protection ≥ ₹10k, Others ≥ ₹15k)', () => {
  assert.equal(creditForPolicy(APR26, pol({ protection: 'Protection', fyp: 10000 })).nopQualifies, true);
  assert.equal(creditForPolicy(APR26, pol({ protection: 'Protection', fyp: 9999 })).nopQualifies, false);
  assert.equal(creditForPolicy(APR26, pol({ protection: 'Others', fyp: 15000 })).nopQualifies, true);
  assert.equal(creditForPolicy(APR26, pol({ protection: 'Others', fyp: 14999 })).nopQualifies, false);
});

test('attribution splits Others vs ULIP+GAP and reconciles to the total', () => {
  const policies = [
    pol({ product: 'Non-Par A', category: 'NonPar', ulipGap: 'A. Non-ULIP', fyp: 100000, wfypPct: 0.5 }), // 50k Others
    pol({ product: 'Wealth X', category: 'ULIP', ulipGap: 'B. ULIP + GAP', fyp: 200000, wfypPct: 0.5 }),  // 100k ULIP
  ];
  const a = attributePolicies(APR26, policies);
  assert.equal(a.totalWfyp, 150000);
  assert.equal(a.wfypOthers, 50000);
  assert.equal(a.wfypUlipGap, 100000);
  assert.equal(a.wfypOthers + a.wfypUlipGap, a.totalWfyp);
  assert.equal(a.nop, 2); // both above ₹15k Others floor
  assert.ok(Math.abs(a.byCategory.reduce((t, c) => t + c.share, 0) - 1) < 1e-9);
  assert.equal(a.byCategory[0].key, 'ULIP'); // largest share first
});

test('reproduces per-policy WFYP, WFYP-post-S2S and NOP for all 21 real policies', () => {
  const misses = [];
  for (const row of fixtures) {
    const c = creditForPolicy(APR26, policyFrom(row));
    if (!near(c.wfyp, Number(row.wfyp))) misses.push(`wfyp ${c.wfyp} vs ${row.wfyp} (${row.product})`);
    if (!near(c.wfypPostS2S, Number(row.wfypPostS2S))) misses.push(`postS2S ${c.wfypPostS2S} vs ${row.wfypPostS2S}`);
    if (c.nopQualifies !== (Number(row.nop) === 1)) misses.push(`nop ${c.nopQualifies} vs ${row.nop}`);
  }
  assert.deepEqual(misses, [], `Policy mismatches:\n${misses.join('\n')}`);
});
