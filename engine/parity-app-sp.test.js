// Parity proof: the SP engine reproduces the live app's four-gate math EXACTLY, for every
// DSE in the shipped dataset. This is the safety net for wiring spEngine into app.js's
// compute() — if the numbers were ever to drift, this fails before anyone opens the app.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateSalesProgression } from './spEngine.js';
import { SP_RULES } from './designs/spRules.js';
import { buildSpInputs, trailingWindow, rollingTotals } from './transform.js';

const data = JSON.parse(readFileSync(new URL('../elevate_data.json', import.meta.url)));

// Oracle: app.js compute()'s exact SP math (assessment at maxMonth, record persistency).
function appOracle(sW, sN, tgt, pers) {
  const wa = tgt.wfyp ? sW / tgt.wfyp : 0;
  const na = tgt.nop ? sN / tgt.nop : 0;
  const wW = Math.min(wa, 1.5) * 0.75, nW = Math.min(na, 1.5) * 0.25, ov = wW + nW;
  const wg = wa >= 0.75, ng = na >= 0.5, wasPass = ov > 1;
  const exempt = pers === 'NA';
  const pPass = exempt ? true : pers >= tgt.thr;
  const eligible = wg && ng && wasPass && pPass;
  let s = Math.min(wa / 0.75, 1) * 0.25 + Math.min(na / 0.5, 1) * 0.25 + Math.min(ov / 1, 1) * 0.30;
  s += (exempt || pPass) ? 0.20 : Math.min((exempt ? 0 : pers) / tgt.thr, 1) * 0.20;
  const progress = Math.max(0, Math.min(s, 1));
  return { wa, na, ov, wg, ng, wasPass, eligible, progress };
}

test('SP engine matches the live app math for every DSE in elevate_data.json', () => {
  const window = trailingWindow(data.meta.maxMonth);
  const mism = [];
  let checked = 0;
  for (const [, e] of Object.entries(data.master)) {
    const tgt = data.targets[e.desg];
    if (!tgt) continue;
    const { wfyp: sW, nop: sN } = rollingTotals(data.monthly[e.bo], window);
    const o = appOracle(sW, sN, tgt, e.pers);
    const sp = buildSpInputs(data, e.bo);
    const g = evaluateSalesProgression(SP_RULES, sp);
    checked++;
    const eq = (a, b) => Math.abs(a - b) <= 1e-9;
    if (g.gates.wfyp !== o.wg || g.gates.nop !== o.ng || g.gates.was !== o.wasPass ||
        g.eligible !== o.eligible || !eq(g.was, o.ov) || !eq(g.progress, o.progress)) {
      mism.push(e.bo);
    }
  }
  assert.ok(checked > 900, `expected the full roster, checked ${checked}`);
  assert.deepEqual(mism, [], `${mism.length} DSEs diverged: ${mism.slice(0, 10).join(', ')}`);
});
