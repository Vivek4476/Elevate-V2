import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { marginalImpact, nextThreshold, optimize } from './optimizer.js';
import { APR26 } from './designs/apr26.js';

const fixtures = JSON.parse(
  readFileSync(new URL('./fixtures/dse-apr26.json', import.meta.url))
);
function inputsFrom(row) {
  return {
    target: Number(row.target), wfypOthers: Number(row.wfypOthers),
    ulipGap: Number(row.ulipGap), ulipFyp: Number(row.ulipFyp),
    persCM: Number(row.persCM), persLM: Number(row.persLM),
    nop: Number(row.nop), holdNotAchieved: row.holdFlag === 'Not Achieved',
  };
}
const lakshya = inputsFrom(fixtures.find(r => r.agent === 'AAA634'));
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;

test('one more policy is worth +₹1,530 after the hold (AAA634)', () => {
  const delta = marginalImpact(APR26, lakshya, { nop: 2 });
  assert.ok(near(delta, 1530.38), `got ${delta}, expected 1530.38`);
});

test('a no-op patch has zero marginal impact', () => {
  assert.equal(marginalImpact(APR26, lakshya, { nop: lakshya.nop }), 0);
});

test('nextThreshold returns the next NOP tier, or null at the top', () => {
  assert.equal(nextThreshold(APR26.nopMultiplier, 1), 2);
  assert.equal(nextThreshold(APR26.nopMultiplier, 3), 4);
  assert.equal(nextThreshold(APR26.nopMultiplier, 7), 8);
  assert.equal(nextThreshold(APR26.nopMultiplier, 8), null);
});

test('Lakshya keeps the easy NOP lever and no persistency lever (already maxed)', () => {
  const recs = optimize(APR26, lakshya);
  const nop = recs.find(r => r.lever === 'nop');
  assert.ok(nop);
  assert.equal(nop.to, 2);
  assert.equal(nop.effort, 'easy');
  assert.ok(near(nop.deltaFinal, 1530.38));
  assert.equal(recs.some(r => r.lever === 'persistency'), false); // 95.4% is the top band
});

test('no NOP lever once the top multiplier tier is reached', () => {
  const maxed = { ...lakshya, nop: 8 };
  assert.equal(optimize(APR26, maxed).some(r => r.lever === 'nop'), false);
});

test('adds a ULIP-grid rupee lever — extra ULIP FYP to the next slab', () => {
  const rec = optimize(APR26, lakshya).find(r => r.lever === 'ulipGrid');
  assert.ok(rec, 'expected a ulipGrid lever');
  assert.ok(near(rec.rupeesNeeded, 450000, 1), `rupeesNeeded ${rec.rupeesNeeded}`); // 550k -> 1,000,000
  assert.ok(rec.deltaFinal > 0);
});

test('adds an achievement-slab rupee lever — extra WFYP to the next payout band', () => {
  const rec = optimize(APR26, lakshya).find(r => r.lever === 'achievement');
  assert.ok(rec, 'expected an achievement lever');
  assert.ok(near(rec.rupeesNeeded, 43696.97, 1), `rupeesNeeded ${rec.rupeesNeeded}`); // 2.0*300000 - 556303.03
  assert.ok(rec.deltaFinal > 0);
});

test('rupee levers disappear when already in the top slab', () => {
  const maxed = { ...lakshya, ulipFyp: 5e6, wfypOthers: 1e7 };
  const recs = optimize(APR26, maxed);
  assert.equal(recs.some(r => r.lever === 'ulipGrid'), false);
  assert.equal(recs.some(r => r.lever === 'achievement'), false);
});

test('recommendations are ranked by ROI (₹ per effort); easy wins surface first', () => {
  const dse = { target: 1e6, wfypOthers: 1e6, ulipGap: 0, ulipFyp: 0,
    persCM: 0.84, persLM: 0.84, nop: 3, holdNotAchieved: false };
  const recs = optimize(APR26, dse);
  const W = { easy: 1, medium: 4, hard: 12 };
  const roi = r => r.deltaFinal / W[r.effort];
  for (let i = 1; i < recs.length; i++)
    assert.ok(roi(recs[i - 1]) >= roi(recs[i]) - 1e-9, 'sorted by ROI');
  const nopIdx = recs.findIndex(r => r.lever === 'nop');           // easy, +₹1,680
  const persIdx = recs.findIndex(r => r.lever === 'persistency');  // medium, +₹2,880
  assert.ok(nopIdx < persIdx, 'easy NOP outranks medium persistency on ROI');
});
