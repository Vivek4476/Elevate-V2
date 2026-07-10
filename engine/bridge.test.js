import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { salesProgressionMarginal, buildDashboardRecommendation } from './bridge.js';
import { SP_RULES } from './designs/spRules.js';
import { APR26 } from './designs/apr26.js';

const incFx = JSON.parse(readFileSync(new URL('./fixtures/dse-apr26.json', import.meta.url)));
const spFx = JSON.parse(readFileSync(new URL('./fixtures/sp-jun26.json', import.meta.url)));
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;

function incInputs(row) {
  return {
    target: +row.target, wfypOthers: +row.wfypOthers, ulipGap: +row.ulipGap,
    ulipFyp: +row.ulipFyp, persCM: +row.persCM, persLM: +row.persLM,
    nop: +row.nop, holdNotAchieved: row.holdFlag === 'Not Achieved',
  };
}
function spInputs(row) {
  return {
    trailingWfyp: +row.sW, trailingNop: +row.sN, targetWfyp: +row.tgtW, targetNop: +row.tgtN,
    persistency: row.pers === 'NA' ? 'NA' : +row.pers, persistencyThreshold: +row.thr,
  };
}

const eligibleSP = {
  targetWfyp: 1e6, targetNop: 10, trailingWfyp: 1.2e6, trailingNop: 10,
  persistency: 0.9, persistencyThreshold: 0.87,
};

test('a move for an already-eligible DSE has zero promotion impact', () => {
  const m = salesProgressionMarginal(SP_RULES, eligibleSP, { trailingNop: eligibleSP.trailingNop + 1 });
  assert.equal(m.wasEligible, true);
  assert.equal(m.nowEligible, true);
  assert.equal(m.deltaProgress, 0);
  assert.equal(m.clearsGate, null);
});

test('one more policy clears the NOP gate at the boundary', () => {
  const failingNop = { targetWfyp: 1e6, targetNop: 10, trailingWfyp: 1e6, trailingNop: 4,
    persistency: 0.9, persistencyThreshold: 0.87 }; // NOP 40% < 50%
  const m = salesProgressionMarginal(SP_RULES, failingNop, { trailingNop: 5 }); // -> 50%
  assert.equal(m.clearsGate, 'nop');
  assert.ok(m.deltaProgress > 0);
});

test('bridge is honest for the real Lakshya: earnings move, already promotion-eligible', () => {
  const rec = buildDashboardRecommendation({
    incentiveDesign: APR26, incentiveInputs: incInputs(incFx.find(r => r.agent === 'AAA634')),
    spRules: SP_RULES, spInputs: spInputs(spFx.find(r => r.bo === 'AAA634')),
  });
  assert.equal(rec.move.lever, 'nop');
  assert.ok(near(rec.incentiveImpact.rupees, 1530.38));
  assert.equal(rec.promotionImpact.alreadyEligible, true);
  assert.equal(rec.helpsBoth, false);
  assert.match(rec.headline, /pure earnings/);
});

test('bridge reports a genuine dual impact when a move helps both sides', () => {
  const rec = buildDashboardRecommendation({
    incentiveDesign: APR26,
    incentiveInputs: { target: 1e6, wfypOthers: 1e6, ulipGap: 0, ulipFyp: 0,
      persCM: 0.9, persLM: 0.9, nop: 1, holdNotAchieved: false },
    spRules: SP_RULES,
    spInputs: { targetWfyp: 1e6, targetNop: 10, trailingWfyp: 1e6, trailingNop: 4,
      persistency: 0.9, persistencyThreshold: 0.87 },
  });
  assert.equal(rec.helpsBoth, true);
  assert.ok(rec.incentiveImpact.rupees > 0);
  assert.ok(rec.promotionImpact.deltaProgress > 0);
  assert.equal(rec.promotionImpact.clearsGate, 'nop');
  assert.match(rec.headline, /toward promotion/);
});

test('bridge returns null when there is nothing left to optimise', () => {
  const rec = buildDashboardRecommendation({
    incentiveDesign: APR26,
    // fully maxed: achievement >=250% (top band), ULIP top slab, NOP tier 8, persistency top band
    incentiveInputs: { target: 1e6, wfypOthers: 2.6e6, ulipGap: 0, ulipFyp: 5e6,
      persCM: 0.95, persLM: 0.95, nop: 8, holdNotAchieved: false },
    spRules: SP_RULES, spInputs: eligibleSP,
  });
  assert.equal(rec, null);
});
