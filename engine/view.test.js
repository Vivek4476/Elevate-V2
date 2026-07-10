import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDseView } from './view.js';
import { APR26 } from './designs/apr26.js';
import { SP_RULES } from './designs/spRules.js';

const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;

// Lakshya: real April incentive inputs + a coherent rolling-SP scenario (3/4 gates).
const incentiveInputs = { target: 300000, wfypOthers: 6303.03, ulipGap: 550000, ulipFyp: 550000,
  persCM: 0.95415, persLM: 0.94867, nop: 1, holdNotAchieved: true };
const spInputs = { targetWfyp: 10000000, targetNop: 50, trailingWfyp: 16800000, trailingNop: 23,
  persistency: 0.957, persistencyThreshold: 0.87 };
const policies = [
  { fyp: 550000, adjFyp: 550000, wfypPct: 1.0, s2sRate: 1, ftZero: false, ft50: false, ft75: false,
    differential: false, protection: 'Others', category: 'ULIP', ulipGap: 'B. ULIP + GAP', product: 'Wealth Aspire' },
  { fyp: 20000, adjFyp: 20000, wfypPct: 0.5, s2sRate: 1, ftZero: false, ft50: false, ft75: false,
    differential: false, protection: 'Others', category: 'NonPar', ulipGap: 'A. Non-ULIP', product: 'Non-Par GAP' },
];

test('buildDseView composes earnings, career, bridge and attribution', () => {
  const view = buildDseView({
    designs: APR26, spRules: SP_RULES, incentiveInputs, spInputs, policies,
    dse: { name: 'Lakshya Hingorani', grade: 'SPMG' },
  });
  assert.ok(near(view.earnings.headline.finalAmount, 5356.34)); // incentive
  assert.equal(view.career.gatesCleared, 3);                    // SP, rolling
  assert.equal(view.bridge.helpsBoth, true);                    // dual impact
  assert.ok(view.attribution.totalWfyp > 0);                    // stage-1 roll-up
  assert.equal(view.dse.name, 'Lakshya Hingorani');
});

test('attribution is null when no policies are supplied', () => {
  const view = buildDseView({ designs: APR26, spRules: SP_RULES, incentiveInputs, spInputs });
  assert.equal(view.attribution, null);
  assert.ok(near(view.earnings.headline.finalAmount, 5356.34));
});
