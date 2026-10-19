import test from 'node:test';
import assert from 'node:assert';
import { computeCalibrated5050EV } from '../../server-lib/analytics/examiner_psyche.js';
import { computeCalibrated5050EV as computeCalibratedClient } from '../../src/lib/examiner_psyche.ts';

test('50:50 EV Mathematical Precision - Server & Client Match', () => {
  // Gate 3 Assertion 1: At P_trap = 0.50 (50% accuracy), calibratedEvPerCall === 0.670
  const ev50Server = computeCalibrated5050EV('PSY_01_INST_SWAP', 5, 10);
  const ev50Client = computeCalibratedClient('PSY_01_INST_SWAP', 5, 10);

  assert.strictEqual(ev50Server.calibratedEvPerCall, 0.670);
  assert.strictEqual(ev50Client.calibratedEvPerCall, 0.670);
  assert.strictEqual(ev50Server.naiveEv, 0.67);
  assert.strictEqual(ev50Server.isEvInverted, false);
  assert.strictEqual(ev50Server.protocol, 'STANDARD_EXECUTION');

  // Gate 3 Assertion 2: At P_trap = 0.20 (80% accuracy), calibratedEvPerCall === 1.468 (+22.02 over 15 calls, MANDATORY_EXECUTION)
  const ev80Server = computeCalibrated5050EV('PSY_02_QUAL_POLARITY', 8, 10);
  const ev80Client = computeCalibratedClient('PSY_02_QUAL_POLARITY', 8, 10);

  assert.strictEqual(ev80Server.calibratedEvPerCall, 1.468);
  assert.strictEqual(ev80Client.calibratedEvPerCall, 1.468);
  assert.strictEqual(ev80Server.cumulativeEv15Calls, 22.02);
  assert.strictEqual(ev80Client.cumulativeEv15Calls, 22.02);
  assert.strictEqual(ev80Server.isEvInverted, false);
  assert.strictEqual(ev80Server.protocol, 'MANDATORY_EXECUTION');

  // Gate 3 Assertion 3: At P_trap = 0.752 (24.8% accuracy), calibratedEvPerCall <= 0.000 and isEvInverted === true (STRICT_ABSTENTION)
  const evInvertedServer = computeCalibrated5050EV('PSY_03_LEGAL_TIER', 248, 1000);
  const evInvertedClient = computeCalibratedClient('PSY_03_LEGAL_TIER', 248, 1000);

  assert.ok(evInvertedServer.calibratedEvPerCall <= 0.000);
  assert.ok(evInvertedClient.calibratedEvPerCall <= 0.000);
  assert.strictEqual(evInvertedServer.isEvInverted, true);
  assert.strictEqual(evInvertedClient.isEvInverted, true);
  assert.strictEqual(evInvertedServer.protocol, 'STRICT_ABSTENTION');

  // Aggressive Execution: 70% accuracy (P_trap = 0.30)
  const ev70 = computeCalibrated5050EV('PSY_04_CAUSAL_INV', 7, 10);
  assert.strictEqual(ev70.protocol, 'AGGRESSIVE_EXECUTION');
  assert.strictEqual(ev70.calibratedEvPerCall, 1.202);

  // Selective Caution: 40% accuracy (P_trap = 0.60)
  const ev40 = computeCalibrated5050EV('PSY_05_SCOPE_MUTATE', 4, 10);
  assert.strictEqual(ev40.protocol, 'SELECTIVE_CAUTION');
  assert.strictEqual(ev40.calibratedEvPerCall, 0.404);
});
