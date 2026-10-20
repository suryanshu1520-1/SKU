import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArchiveTableMarkdown, parseArchive, parseOverview, practicePaper } from './examiner-psyche-view';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

test('overview preserves returned zero counts and excludes unsampled qualifier defaults', () => {
  const result = parseOverview({ success: true, data: {
    bankTrends: { census: { totalPrelimsQuestions: 4156 }, subjectDistribution: [
      { subject: 'Polity', count: 0, pillar: 'GS2' },
      { subject: 'Invalid count', count: '100' },
    ] },
    qualifiers: { extremeQualifiers: [
      { token: 'never', sampleSize: 0, falseStatementPct: 80, trueStatementPct: 20 },
      { token: 'all', sampleSize: 12, falseStatementPct: 0, trueStatementPct: 100 },
    ] },
  } });
  assert.equal(result.subjects.length, 1);
  assert.equal(result.subjects[0].count, 0);
  assert.equal(result.qualifiers.length, 1);
  assert.equal(result.qualifiers[0].token, 'all');
  assert.equal(result.qualifiers[0].falsePct, 0);
  assert.equal('census' in result, false);
});

test('guidance keeps useful text while withholding numerical rubrics and forecasts', () => {
  const result = parseOverview({ success: true, data: {
    directiveRubrics: [{ directive: 'Discuss', coreIntent: 'Consider several perspectives.', markAllocationBlueprint: [{ component: 'Context', weightPct: 25 }] }],
    csatAnatomy: { readingComprehension: { dominantQuestionType: 'Assumptions (62%), Main idea (14%)' } },
    cicadaTopics: [{ nodeId: 'GS2.POL.PARLIAMENT', topic: 'Money Bills', pillar: 'GS2', recurrenceScore: 98, historicalTestYears: [2025] }],
  } });
  assert.deepEqual(result.directives[0].steps, ['Context']);
  assert.equal(result.csat[0].focus, 'Assumptions, Main idea');
  assert.deepEqual(result.recurringTopics[0], { id: 'GS2.POL.PARLIAMENT', title: 'Money Bills', paper: 'GS2' });
});

test('unreadable payloads fail while valid empty responses remain empty', () => {
  for (const payload of [null, { success: false, data: {} }, { success: true, data: {} }, { success: true, data: { bankTrends: 'broken' } }]) {
    assert.throws(() => parseOverview(payload));
  }
  assert.deepEqual(parseOverview({ success: true, data: { bankTrends: { subjectDistribution: [] } } }).subjects, []);
  assert.throws(() => parseArchive({ success: true, data: {} }));
  assert.deepEqual(parseArchive({ success: true, data: { prelimsQuestions: [], mainsQuestions: [] } }), []);
});

test('practice permits broad supported paper keys and rejects exact-topic claims', () => {
  assert.equal(practicePaper('GS-2'), 'GS2');
  assert.equal(practicePaper('CSAT'), 'CSAT');
  assert.equal(practicePaper('STATIC_GK'), 'STATIC_GK');
  for (const value of ['GS4', 'GS2.POL.PARLIAMENT', 'Fundamental Rights', '', null]) assert.equal(practicePaper(value), null);
});

test('archive handles option forms, rejects placeholders and validates answer keys', () => {
  const result = parseArchive({ success: true, data: { prelimsQuestions: [
    { id: 'one', stem: 'First question', year: 2023, options: { a: 'First', b: 'Second' }, official_key: '(B)' },
    { id: 'two', stem: 'Second question', year: 2024, options: ['First', 'Second'], official_key: 'D' },
    { id: 'broken', stem: 'Placeholder item', options: { a: '(a) Option A', b: 'Option B' }, official_key: 'A' },
    { id: 'empty', stem: '' },
  ], mainsQuestions: [{ id: 'essay', year: 2022, prompt: 'Discuss a policy.', rubric_level_1: 'Consider the context.' }] } });
  assert.equal(result.length, 3);
  assert.equal(result[0].answerKey, 'B');
  assert.equal(result[1].answerKey, '');
  assert.equal(result[1].options[0].key, 'A');
  assert.equal(result[2].stage, 'mains');
  assert.deepEqual(result[2].notes, ['Consider the context.']);
});

test('collapsed archive tables render as tables without losing the question or cells', () => {
  const prompt = 'Consider the following pairs: | | Country | Resource | |---|---|---| | I. | Botswana | Diamond | | II. | Chile | Lithium | How many rows are correct?';
  const rendered = renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, normalizeArchiveTableMarkdown(prompt)));
  assert.match(rendered, /<table>/);
  assert.equal((rendered.match(/<tr>/g) || []).length, 3);
  for (const text of ['Consider the following pairs:', 'Country', 'Resource', 'Botswana', 'Diamond', 'Chile', 'Lithium', 'How many rows are correct?']) {
    assert.ok(rendered.includes(text), text);
  }
});

test('table formatting leaves ordinary prose, incomplete tables and existing markdown untouched', () => {
  for (const prompt of ['A | B is notation, not a table.', 'Intro | A | B | |---|---| no rows supplied', '| A | B |\n|---|---|\n| X | Y |']) {
    assert.equal(normalizeArchiveTableMarkdown(prompt), prompt);
  }
});
