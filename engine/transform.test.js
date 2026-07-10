import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseIncentiveDseRow, mapPolicyRow, trailingWindow, rollingTotals,
  buildSpInputs, groupPoliciesByDse, transformMonth,
} from './transform.js';
import { buildDseView } from './view.js';
import { APR26 } from './designs/apr26.js';
import { SP_RULES } from './designs/spRules.js';

// Raw inputs, as the two separate files arrive:
const dseRows = JSON.parse(readFileSync(new URL('./fixtures/dse-apr26.json', import.meta.url)));      // incentive workbook (DSE sheet)
const spData = JSON.parse(readFileSync(new URL('../elevate_data.json', import.meta.url)));            // SP file (master/monthly/targets/meta)
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;

test('parseIncentiveDseRow maps types and #N/A persistency to NaN', () => {
  const na = dseRows.find(r => r.persCM === '#N/A');
  const { incentiveInputs: i } = parseIncentiveDseRow(na);
  assert.ok(Number.isNaN(i.persCM));
  assert.ok(Number.isNaN(i.persLM));

  const l = parseIncentiveDseRow(dseRows.find(r => r.agent === 'AAA634')).incentiveInputs;
  assert.equal(l.target, 300000);
  assert.equal(l.nop, 1);
  assert.equal(l.holdNotAchieved, true);
});

test('trailingWindow is the 12 months ending at maxMonth', () => {
  const w = trailingWindow('2026-06');
  assert.equal(w.length, 12);
  assert.equal(w[0], '2025-07');
  assert.equal(w[11], '2026-06');
});

test('rollingTotals reproduces the SP fixture aggregation (AAA634)', () => {
  const spFx = JSON.parse(readFileSync(new URL('./fixtures/sp-jun26.json', import.meta.url)));
  const fx = spFx.find(r => r.bo === 'AAA634');
  const t = rollingTotals(spData.monthly['AAA634'], trailingWindow(spData.meta.maxMonth));
  assert.ok(near(t.wfyp, Number(fx.sW), 1));
  assert.equal(t.nop, Number(fx.sN));
});

test('buildSpInputs pulls grade target + persistency for a BO', () => {
  const sp = buildSpInputs(spData, 'AAA634');
  assert.equal(sp.targetWfyp, spData.targets.SPMG.wfyp);
  assert.equal(sp.persistencyThreshold, 0.87);
  assert.ok(sp.trailingNop > 0);
});

test('groupPoliciesByDse groups by DSE code and skips unattributed rows', () => {
  const rows = [
    { dse: 'AAA634', fyp: 100000, adjFyp: 100000, wfypPct: 0.5, s2sRate: 1, productCategory: 'X', ulipGap: 'A. Non-ULIP', product: 'P1', protection: 'Others' },
    { dse: 'AAA634', fyp: 200000, adjFyp: 200000, wfypPct: 0.5, s2sRate: 1, productCategory: 'Y', ulipGap: 'B. ULIP + GAP', product: 'P2', protection: 'Others' },
    { dse: null, fyp: 5000, adjFyp: 5000, wfypPct: 0.5, s2sRate: 1, productCategory: 'Z', ulipGap: 'A. Non-ULIP', product: 'P3', protection: 'Others' },
  ];
  const g = groupPoliciesByDse(rows);
  assert.equal(g.get('AAA634').length, 2);
  assert.equal(g.has(null), false);
});

test('transformMonth reports join coverage across the two files', () => {
  const all = transformMonth({ dseRows, spData, withUnjoined: true });
  const joined = all.filter(r => r.joined);
  assert.equal(all.length, dseRows.length);
  assert.ok(joined.length > 0, 'at least some DSEs join across both files');
  // filtered (default) returns only joined records
  assert.equal(transformMonth({ dseRows, spData }).length, joined.length);
});

test('transformMonth joins the two files and feeds buildDseView (real Lakshya, AAA634)', () => {
  const rows = dseRows.filter(r => r.agent === 'AAA634');
  const [rec] = transformMonth({ dseRows: rows, spData });
  assert.ok(rec, 'expected AAA634 to join across both files');
  assert.equal(rec.dse.name, 'Lakshya Jayesh Hingorani');

  const view = buildDseView({ designs: APR26, spRules: SP_RULES, ...rec });
  assert.ok(near(view.earnings.headline.finalAmount, 5356.34)); // real April incentive
  assert.equal(view.career.eligible, true);                     // his real rolling SP: 4/4 gates
  assert.equal(view.career.gatesCleared, 4);
});
