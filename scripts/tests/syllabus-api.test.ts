import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { syllabusRouter, handleUserSyllabusProgress } from '../../server-lib/syllabus/routes.js';

test('Syllabus Versioned Read Endpoints Integration Suite', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/syllabus', syllabusRouter);
  app.get('/api/me/syllabus-progress', handleUserSyllabusProgress);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/syllabus`;

  t.after(() => {
    server.close();
  });

  // -------------------------------------------------------------------------
  // 1. GET /api/syllabus/catalog
  // -------------------------------------------------------------------------
  await t.test('GET /api/syllabus/catalog returns versioned public catalog and cache headers', async () => {
    const res = await fetch(`${baseUrl}/catalog`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('cache-control')?.includes('public'));
    assert.ok(res.headers.get('cache-control')?.includes('s-maxage=3600'));

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.version, '2026.10');
    assert.strictEqual(body.status, 'available');
    assert.ok(Array.isArray(body.subjects));
    assert.strictEqual(body.subjects.length, 6);
    assert.ok(Array.isArray(body.nodes));
    assert.ok(body.nodes.length >= 130);

    // Verify node structure has no personal or secret data
    const firstNode = body.nodes[0];
    assert.ok(firstNode.id);
    assert.ok(firstNode.paper);
    assert.ok(firstNode.gloss);
    assert.strictEqual(typeof firstNode.resourceCount, 'number');
  });

  await t.test('GET /api/syllabus/catalog supports optional paper filter', async () => {
    const res = await fetch(`${baseUrl}/catalog?paper=GS2`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.nodes.every((n: any) => n.paper === 'GS2'));
  });

  // -------------------------------------------------------------------------
  // 2. GET /api/syllabus/nodes/:nodeId
  // -------------------------------------------------------------------------
  await t.test('GET /api/syllabus/nodes/:nodeId returns 404 for unknown node', async () => {
    const res = await fetch(`${baseUrl}/nodes/UNKNOWN_TOPIC_123`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'UNKNOWN_NODE');
  });

  await t.test('GET /api/syllabus/nodes/:nodeId returns validated node profile with evidence metrics', async () => {
    const res = await fetch(`${baseUrl}/nodes/GS2.POL.CONSTITUTION`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('cache-control')?.includes('s-maxage=1800'));

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.node.id, 'GS2.POL.CONSTITUTION');
    assert.strictEqual(body.node.paper, 'GS2');
    assert.ok(body.metrics.prelimsTotal.value > 0);
    assert.strictEqual(body.metrics.prelimsTotal.isDirectNodeOnly, true);
    assert.ok(Array.isArray(body.resources));
    assert.ok(body.resources.length > 0);
  });

  // -------------------------------------------------------------------------
  // 3. GET /api/syllabus/nodes/:nodeId/questions
  // -------------------------------------------------------------------------
  await t.test('GET /api/syllabus/nodes/:nodeId/questions returns 404 for unknown node', async () => {
    const res = await fetch(`${baseUrl}/nodes/NON_EXISTENT_NODE/questions`);
    assert.strictEqual(res.status, 404);
  });

  await t.test('GET /api/syllabus/nodes/:nodeId/questions returns empty array with 0 items for zero-pool node', async () => {
    // ESSAY.ENV is in DB but has 0 prelims questions
    const res = await fetch(`${baseUrl}/nodes/ESSAY.ENV/questions`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.pagination.totalItems, 0);
    assert.deepEqual(body.questions, []);
  });

  await t.test('GET /api/syllabus/nodes/:nodeId/questions paginates and omits official_key in preview', async () => {
    const res = await fetch(`${baseUrl}/nodes/GS2.POL.PARLIAMENT/questions?pageSize=5`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.nodeId, 'GS2.POL.PARLIAMENT');
    assert.ok(body.questions.length <= 5);

    for (const q of body.questions) {
      assert.ok(q.id);
      assert.ok(q.stem);
      // Exam security invariant: officialKey must NOT be leaked in public question preview
      assert.strictEqual((q as any).official_key, undefined);
      assert.strictEqual((q as any).officialKey, undefined);
    }
  });

  // -------------------------------------------------------------------------
  // 4. GET /api/syllabus/nodes/:nodeId/articles
  // -------------------------------------------------------------------------
  await t.test('GET /api/syllabus/nodes/:nodeId/articles returns bounded article relations', async () => {
    const res = await fetch(`${baseUrl}/nodes/GS2.POL.CONSTITUTION/articles?pageSize=5`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.articles));
    assert.ok(body.articles.length <= 5);
  });

  // -------------------------------------------------------------------------
  // 5. GET /api/me/syllabus-progress
  // -------------------------------------------------------------------------
  await t.test('GET /api/me/syllabus-progress rejects unauthenticated access with 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/me/syllabus-progress`);
    assert.strictEqual(res.status, 401);
    assert.ok(res.headers.get('cache-control')?.includes('no-store'));
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'UNAUTHORIZED');
  });
});
