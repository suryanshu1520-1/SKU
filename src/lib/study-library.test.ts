import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDY_RESOURCES,
  STUDY_SUBJECTS,
  getStudyUrl,
  resolveStudySelection,
  resourcesForSubject,
  searchStudyResources,
  studySelectionForResource,
} from './study-library.js';

function subjectId(paper: string): string {
  const subject = STUDY_SUBJECTS.find((entry) => entry.paper === paper);
  assert.ok(subject, `The ${paper} collection is available`);
  return subject.id;
}

function assertUsableSelection(params: URLSearchParams, preferredSubjectId?: string) {
  const selection = resolveStudySelection(params, preferredSubjectId);
  const item = STUDY_RESOURCES.find((entry) => entry.id === selection.itemId);
  assert.ok(item, 'The reader has an existing item rather than an undefined selection');
  assert.equal(item.subjectId, selection.subjectId, 'The selected subject owns the reading item');
  assert.equal(item.view, selection.view, 'The selected mode contains the reading item');
  return selection;
}

test('a copied library link reopens every available resource in its subject and study mode', () => {
  for (const resource of STUDY_RESOURCES) {
    const selection = studySelectionForResource(resource);
    const url = new URL(getStudyUrl(selection), 'http://localhost:3000');
    assert.equal(url.pathname, '/library');
    assert.deepEqual(resolveStudySelection(url.searchParams), selection, resource.id);
  }
});

test('corrupted or obsolete deep links still open a usable reading item', () => {
  for (const query of [
    'subject=removed-subject&view=removed-mode&item=removed-item',
    'subject=%3Cscript%3E&view=writing&item=%00',
    'view=not-a-mode',
    'item=does-not-exist',
  ]) {
    assertUsableSelection(new URLSearchParams(query));
  }
});

test('a valid explicit subject takes precedence over preferences; an invalid subject uses a valid preference', () => {
  const polity = subjectId('GS2');
  const ethics = subjectId('GS4');
  assert.equal(resolveStudySelection(new URLSearchParams({ subject: polity }), ethics).subjectId, polity);
  assert.equal(resolveStudySelection(new URLSearchParams({ subject: 'deleted' }), ethics).subjectId, ethics);
  assertUsableSelection(new URLSearchParams({ subject: 'deleted' }), 'also-deleted');
});

test('changing subjects cannot leave a stale item from another collection in the reader', () => {
  const polity = subjectId('GS2');
  const history = subjectId('GS1');
  const oldItem = resourcesForSubject(polity, 'notes')[0];
  assert.ok(oldItem);
  const selected = assertUsableSelection(new URLSearchParams({
    subject: history,
    view: 'notes',
    item: oldItem.id,
  }));
  assert.equal(selected.subjectId, history);
  assert.notEqual(selected.itemId, oldItem.id);
});

test('an item from another mode does not silently override the requested mode', () => {
  const polity = subjectId('GS2');
  const map = resourcesForSubject(polity, 'explore').find((entry) => entry.kind === 'map');
  assert.ok(map);
  const selected = assertUsableSelection(new URLSearchParams({ subject: polity, view: 'notes', item: map.id }));
  assert.equal(selected.view, 'notes');
  assert.notEqual(selected.itemId, map.id);
});

test('static reference opens comparison resources by default, including after an invalid mode', () => {
  const reference = subjectId('STATIC_GK');
  for (const params of [
    new URLSearchParams({ subject: reference }),
    new URLSearchParams({ subject: reference, view: 'removed-mode' }),
  ]) {
    const selected = assertUsableSelection(params);
    assert.equal(selected.subjectId, reference);
    assert.equal(selected.view, 'explore');
  }
});

test('CSAT writing links fall back to study notes without offering the unsupported qualification blueprint', () => {
  const csat = subjectId('CSAT');
  const selected = assertUsableSelection(new URLSearchParams({ subject: csat, view: 'writing' }));
  assert.equal(selected.subjectId, csat);
  assert.equal(selected.view, 'notes');
  assert.equal(resourcesForSubject(csat, 'writing').length, 0);
  assert.equal(searchStudyResources('guaranteed qualification').length, 0);
});

test('global search finds information inside reference-table cells across subjects', () => {
  const results = searchStudyResources('  SANGAI   deer  ');
  const wetlands = results.find((entry) => entry.kind === 'reference' && entry.content.id === 'stat-ramsar-matrix');
  assert.ok(wetlands, 'A fact inside a wetland row is discoverable without knowing its table title');
  assert.equal(wetlands.subjectId, subjectId('STATIC_GK'));
  assert.equal(wetlands.view, 'explore');
  assert.ok(!wetlands.title.toLocaleLowerCase().includes('sangai'));
});

test('global search discovers a worked example even when its terms are absent from the map title', () => {
  const results = searchStudyResources('rainwater harvesting');
  const map = results.find((entry) => entry.kind === 'map' && entry.content.id === 'mm-rc-rules');
  assert.ok(map, 'A comprehension example is searchable alongside concept notes and tables');
  assert.equal(map.subjectId, subjectId('CSAT'));
  assert.ok(!map.title.toLocaleLowerCase().includes('rainwater'));
});

test('global search combines subject context and article substance, rather than matching any single query word', () => {
  const results = searchStudyResources('polity writs');
  assert.ok(results.some((entry) => entry.kind === 'map' && entry.content.id === 'mm-writs'));
  assert.ok(results.every((entry) => entry.subjectId === subjectId('GS2')));
  assert.deepEqual(searchStudyResources('writs never-existing-search-term'), []);
  assert.deepEqual(searchStudyResources(' \t\n '), []);
});

test('all resource identities are unique and stay within a real subject and supported reader mode', () => {
  assert.ok(STUDY_RESOURCES.length > 0);
  assert.equal(new Set(STUDY_RESOURCES.map((entry) => entry.id)).size, STUDY_RESOURCES.length);
  for (const entry of STUDY_RESOURCES) {
    assert.ok(STUDY_SUBJECTS.some((subject) => subject.id === entry.subjectId), entry.id);
    assert.ok(['notes', 'explore', 'writing'].includes(entry.view), entry.id);
    assert.equal(entry.sourceStatus, 'editorial', 'Local notes do not gain a sourced/verified guarantee from the redesign');
  }
});
