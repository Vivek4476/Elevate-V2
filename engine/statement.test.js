import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildEarningsStatement } from './statement.js';
import { evaluateDSE } from './incentiveEngine.js';
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
const sum = xs => xs.reduce((t, x) => t + x, 0);

test('statement final matches the engine', () => {
  const s = buildEarningsStatement(APR26, lakshya);
  assert.ok(near(s.headline.finalAmount, evaluateDSE(APR26, lakshya).finalAmount));
  assert.ok(near(s.headline.finalAmount, 5356.34));
});

test('credits + deductions reconstruct the final (no invented numbers)', () => {
  const s = buildEarningsStatement(APR26, lakshya);
  const recomposed = sum(s.credits.map(c => c.amount)) + sum(s.deductions.map(d => d.amount));
  assert.ok(near(recomposed, s.headline.finalAmount));
});

test('credits sum to the 100%/no-hold baseline', () => {
  const s = buildEarningsStatement(APR26, lakshya);
  assert.ok(near(sum(s.credits.map(c => c.amount)), s.headline.baseline)); // == postPersistency
  assert.ok(near(s.headline.baseline, 10202.55));
});

test('on-the-table equals the recoverable NOP drag + hold', () => {
  const s = buildEarningsStatement(APR26, lakshya);
  assert.ok(near(s.headline.onTheTable, 4846.21));
  assert.ok(s.deductions.every(d => d.recoverable)); // both the NOP drag and the hold
});

test('journey running totals trace the engine chain and end at final', () => {
  const s = buildEarningsStatement(APR26, lakshya);
  const pers = s.journey.find(j => j.key === 'persistency');
  assert.ok(near(pers.running, 10202.55));
  assert.ok(near(s.journey.at(-1).running, s.headline.finalAmount));
});

test('recommendations come from the optimizer', () => {
  const s = buildEarningsStatement(APR26, lakshya);
  assert.equal(s.recommendations[0].lever, 'nop');
});

test('a full-tier, no-hold DSE has no deductions (final == baseline)', () => {
  const dse = { target: 1e6, wfypOthers: 1e6, ulipGap: 0, ulipFyp: 0,
    persCM: 0.95, persLM: 0.95, nop: 4, holdNotAchieved: false };
  const s = buildEarningsStatement(APR26, dse);
  assert.equal(s.deductions.length, 0);
  assert.ok(near(s.headline.finalAmount, s.headline.baseline));
  assert.ok(near(sum(s.credits.map(c => c.amount)), s.headline.finalAmount));
});

test('final reconstructs for all 20 real DSE rows', () => {
  const misses = [];
  for (const row of fixtures) {
    const inp = inputsFrom(row);
    const s = buildEarningsStatement(APR26, inp);
    const recomposed = sum(s.credits.map(c => c.amount)) + sum(s.deductions.map(d => d.amount));
    if (!near(recomposed, Number(row.final), 0.05))
      misses.push(`${row.agent}: recomposed ${recomposed.toFixed(2)} vs sheet ${row.final}`);
  }
  assert.deepEqual(misses, [], `Reconstruction mismatches:\n${misses.join('\n')}`);
});
