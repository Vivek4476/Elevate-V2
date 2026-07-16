// Parity lock: the client engine at the DSE's UNCHANGED base inputs must reproduce the
// frozen contract final. If these ever diverge, the simulator is silently lying.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APR26 } from '../engine/designs/apr26.js';
import { evaluateDSE } from '../engine/incentiveEngine.js';

// AAA634 raw inputs + the frozen contract final (from pipeline/cli.py build).
const SIM_INCENTIVE = { target: 300000, wfypOthers: 6303.03, ulipGap: 550000, ulipFyp: 550000,
  persCM: 0.95415, persLM: 0.94867, nop: 1, holdNotAchieved: true };
const CONTRACT_FINAL = 5356.336356;

test('parity lock: client engine at base inputs == frozen contract final (AAA634)', () => {
  const f = evaluateDSE(APR26, SIM_INCENTIVE).finalAmount;
  assert.ok(Math.abs(f - CONTRACT_FINAL) <= 0.01, `client ₹${f} must match contract ₹${CONTRACT_FINAL}`);
});
