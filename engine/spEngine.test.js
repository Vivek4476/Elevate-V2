import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateSalesProgression } from './spEngine.js';
import { SP_RULES } from './designs/spRules.js';

const fixtures = JSON.parse(
  readFileSync(new URL('./fixtures/sp-jun26.json', import.meta.url))
);
function inputsFrom(row) {
  return {
    trailingWfyp: Number(row.sW),
    trailingNop: Number(row.sN),
    targetWfyp: Number(row.tgtW),
    targetNop: Number(row.tgtN),
    persistency: row.pers === 'NA' ? 'NA' : Number(row.pers),
    persistencyThreshold: Number(row.thr),
  };
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('reproduces WAS and eligibility for a real DSE (BU7031)', () => {
  const row = fixtures.find(r => r.bo === 'BU7031');
  const out = evaluateSalesProgression(SP_RULES, inputsFrom(row));
  assert.ok(near(out.was, 0.8369694453125), `WAS got ${out.was}`);
  assert.equal(out.gates.wfyp, false); // 0.649 < 0.75
  assert.equal(out.gates.nop, true);   // 1.4 >= 0.5
  assert.equal(out.gates.was, false);  // 0.837 <= 1.0
  assert.equal(out.eligible, false);
});

test('reproduces achievement, WAS, gates and eligibility for all 14 real DSEs', () => {
  const misses = [];
  for (const row of fixtures) {
    const o = evaluateSalesProgression(SP_RULES, inputsFrom(row));
    if (!near(o.wfypAch, row.wa)) misses.push(`${row.bo} wfypAch ${o.wfypAch} vs ${row.wa}`);
    if (!near(o.nopAch, row.na)) misses.push(`${row.bo} nopAch ${o.nopAch} vs ${row.na}`);
    if (!near(o.was, row.was)) misses.push(`${row.bo} was ${o.was} vs ${row.was}`);
    if (o.gates.wfyp !== row.wg) misses.push(`${row.bo} gate wfyp ${o.gates.wfyp} vs ${row.wg}`);
    if (o.gates.nop !== row.ng) misses.push(`${row.bo} gate nop ${o.gates.nop} vs ${row.ng}`);
    if (o.gates.was !== row.wasPass) misses.push(`${row.bo} gate was ${o.gates.was} vs ${row.wasPass}`);
    if (o.gates.persistency !== row.pPass) misses.push(`${row.bo} gate pers ${o.gates.persistency} vs ${row.pPass}`);
    if (o.eligible !== row.eligible) misses.push(`${row.bo} eligible ${o.eligible} vs ${row.eligible}`);
  }
  assert.deepEqual(misses, [], `SP mismatches:\n${misses.join('\n')}`);
});

const base = { targetWfyp: 1e6, targetNop: 10, persistency: 0.9, persistencyThreshold: 0.87 };

test('WAS caps each component at 150%', () => {
  // wfypAch 200% -> capped to 150%; nop 0
  const o = evaluateSalesProgression(SP_RULES, { ...base, trailingWfyp: 2e6, trailingNop: 0 });
  assert.ok(near(o.was, 1.5 * 0.75)); // 1.125
});

test('gate boundaries: WFYP >=75%, NOP >=50%, WAS strictly >100%', () => {
  const at = (w, n) => evaluateSalesProgression(SP_RULES, { ...base, trailingWfyp: w, trailingNop: n }).gates;
  assert.equal(at(750000, 5).wfyp, true);   // exactly 75%
  assert.equal(at(749000, 5).wfyp, false);  // just under
  assert.equal(at(760000, 5).nop, true);    // exactly 50%
  assert.equal(at(760000, 4).nop, false);   // 40%
  // WAS exactly 1.0 must NOT pass (strict >)
  const wasExactly1 = evaluateSalesProgression(SP_RULES, { ...base, trailingWfyp: 1e6, trailingNop: 10 });
  assert.ok(near(wasExactly1.was, 1.0));
  assert.equal(wasExactly1.gates.was, false);
});

test("new joiner ('NA' persistency) is exempt and that gate passes", () => {
  const o = evaluateSalesProgression(SP_RULES, { ...base, trailingWfyp: 1.2e6, trailingNop: 10, persistency: 'NA' });
  assert.equal(o.persistencyExempt, true);
  assert.equal(o.gates.persistency, true);
});

test('a fully-eligible DSE: 4 gates, progress 1.0, no next gate', () => {
  const o = evaluateSalesProgression(SP_RULES, { ...base, trailingWfyp: 1.2e6, trailingNop: 10 });
  assert.equal(o.eligible, true);
  assert.equal(o.gatesCleared, 4);
  assert.ok(near(o.progress, 1.0));
  assert.equal(o.nextGate, null);
});

test('progress clamps to 0 when trailing WFYP is negative (clawbacks)', () => {
  const o = evaluateSalesProgression(SP_RULES, { ...base, trailingWfyp: -4724841, trailingNop: 3, persistency: 0.87 });
  assert.equal(o.progress, 0);
  assert.ok(o.was < 0); // WAS itself can go negative; progress must not
});

test('nextGate is the first unmet gate', () => {
  // WFYP met, NOP not -> chase NOP
  const o = evaluateSalesProgression(SP_RULES, { ...base, trailingWfyp: 1e6, trailingNop: 2 });
  assert.equal(o.gates.wfyp, true);
  assert.equal(o.gates.nop, false);
  assert.equal(o.nextGate, 'nop');
});
