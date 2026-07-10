import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateDSE, persistencyMultiplier } from './incentiveEngine.js';
import { APR26 } from './designs/apr26.js';

const fixtures = JSON.parse(
  readFileSync(new URL('./fixtures/dse-apr26.json', import.meta.url))
);

// Map a raw DSE-sheet fixture row into the engine's input shape.
function inputsFrom(row) {
  return {
    target:      Number(row.target),
    wfypOthers:  Number(row.wfypOthers),
    ulipGap:     Number(row.ulipGap),   // WFYP (ULIP+GAP) — drives achievement
    ulipFyp:     Number(row.ulipFyp),   // FYP (ULIP+GAP) — drives the ULIP grid
    persCM:      Number(row.persCM),
    persLM:      Number(row.persLM),
    nop:         Number(row.nop),
    holdNotAchieved: row.holdFlag === 'Not Achieved',
  };
}

// The sheet stores some rates as text ("4%", "90%") and some as numbers ("0.7").
const parsePct = s => (String(s).trim().endsWith('%') ? parseFloat(s) / 100 : Number(s));
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;

test('reproduces the sheet Final Amount for AAA634 (with PIFA hold)', () => {
  const row = fixtures.find(r => r.agent === 'AAA634');
  const out = evaluateDSE(APR26, inputsFrom(row));
  assert.ok(near(out.finalAmount, 5356.34),
    `AAA634 final: got ${out.finalAmount}, expected 5356.34`);
});

// --- the validation gate: the config reproduces the sheet across every real DSE ---
test('reproduces Final Amount for all 20 real DSE rows', () => {
  const misses = [];
  for (const row of fixtures) {
    const out = evaluateDSE(APR26, inputsFrom(row));
    if (!near(out.finalAmount, Number(row.final), 0.05)) {
      misses.push(`${row.agent}: got ${out.finalAmount.toFixed(2)}, sheet ${row.final}`);
    }
  }
  assert.deepEqual(misses, [], `Final mismatches:\n${misses.join('\n')}`);
});

test('reproduces each intermediate (payout %, persistency mult, NOP mult, total)', () => {
  const misses = [];
  for (const row of fixtures) {
    const out = evaluateDSE(APR26, inputsFrom(row));
    if (!near(out.payoutPct, parsePct(row.payoutPct), 1e-9))
      misses.push(`${row.agent} payoutPct: ${out.payoutPct} vs ${row.payoutPct}`);
    if (!near(out.persMult, Number(row.maxV), 1e-6))
      misses.push(`${row.agent} persMult: ${out.persMult} vs ${row.maxV}`);
    if (!near(out.nopMult, parsePct(row.nopMult), 1e-9))
      misses.push(`${row.agent} nopMult: ${out.nopMult} vs ${row.nopMult}`);
    if (!near(out.total, Number(row.total), 0.02))
      misses.push(`${row.agent} total: ${out.total} vs ${row.total}`);
  }
  assert.deepEqual(misses, [], `Intermediate mismatches:\n${misses.join('\n')}`);
});

// --- boundary / rule units ---
test('persistency 0.60–0.86 band uses the persistency value itself', () => {
  assert.equal(persistencyMultiplier(APR26, 0.65, 0.60), 0.65); // <0.80 so no booster
});

test('growth booster lifts a mid-band multiplier to 1.00 (>=80% and +2% MoM)', () => {
  assert.equal(persistencyMultiplier(APR26, 0.82, 0.79), 1.00); // base 0.82 -> booster 1.0
});

test('persistency >=92% gives 1.20', () => {
  assert.equal(persistencyMultiplier(APR26, 0.93, 0.93), 1.20);
});

test('missing persistency score (#N/A / new joiner) defaults the multiplier to 1.00', () => {
  assert.equal(persistencyMultiplier(APR26, NaN, NaN), 1.00);
});

test('NOP multiplier tiers: 1->0.70, 2->0.90, 4->1.00, 8->1.20', () => {
  const base = { target: 1e6, wfypOthers: 1e6, ulipGap: 0, ulipFyp: 0,
    persCM: 0.9, persLM: 0.9, holdNotAchieved: false };
  assert.equal(evaluateDSE(APR26, { ...base, nop: 1 }).nopMult, 0.70);
  assert.equal(evaluateDSE(APR26, { ...base, nop: 2 }).nopMult, 0.90);
  assert.equal(evaluateDSE(APR26, { ...base, nop: 4 }).nopMult, 1.00);
  assert.equal(evaluateDSE(APR26, { ...base, nop: 8 }).nopMult, 1.20);
});

test('no PIFA hold => final equals NOP payout', () => {
  const row = fixtures.find(r => r.agent === 'AAA634');
  const out = evaluateDSE(APR26, { ...inputsFrom(row), holdNotAchieved: false });
  assert.ok(near(out.finalAmount, out.nopPayout, 1e-9));
  assert.ok(near(out.finalAmount, 7141.78));
});

test('achievement below 60% earns 0% payout and no ULIP credit', () => {
  const out = evaluateDSE(APR26, { target: 1e6, wfypOthers: 500000, ulipGap: 0,
    ulipFyp: 600000, persCM: 0.95, persLM: 0.95, nop: 5, holdNotAchieved: false });
  assert.equal(out.payoutPct, 0);      // 50% achievement -> 0% band
  assert.equal(out.payoutUlip, 0);     // ULIP credited only when ach >= 60%
  assert.equal(out.finalAmount, 0);
});
