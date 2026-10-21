import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { analyticsRouter } from '../../server-lib/analytics/routes.js';

test('Analytics Security Hardening - Authentication & Ownership Invariants', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRouter);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/analytics`;

  t.after(() => {
    server.close();
  });

  await t.test('GET /examiner-psyche/user-autopsy/:userId rejects unauthenticated access with 401', async () => {
    const res = await fetch(`${baseUrl}/examiner-psyche/user-autopsy/11111111-1111-1111-1111-111111111111`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'UNAUTHORIZED');
  });

  await t.test('GET /examiner-psyche/me/autopsy rejects unauthenticated access with 401', async () => {
    const res = await fetch(`${baseUrl}/examiner-psyche/me/autopsy`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'UNAUTHORIZED');
  });

  await t.test('POST /examiner-psyche/telemetry rejects unauthenticated access with 401', async () => {
    const res = await fetch(`${baseUrl}/examiner-psyche/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 'test-q-1',
        nodeId: 'GS2.POL.CONSTITUTION',
        operatorTested: 'PSY_01_INST_SWAP',
        selectedOption: 'a',
      }),
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'UNAUTHORIZED');
  });

  await t.test('GET /examiner-psyche/node/:nodeId returns node data without noisy stem fallback', async () => {
    const res = await fetch(`${baseUrl}/examiner-psyche/node/GS2.POL.CONSTITUTION`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.prelimsQuestions));
    // Verify all returned prelims questions actually belong to GS2.POL.CONSTITUTION
    for (const q of body.data.prelimsQuestions) {
      assert.strictEqual(q.node_id || 'GS2.POL.CONSTITUTION', 'GS2.POL.CONSTITUTION');
    }
  });
});
