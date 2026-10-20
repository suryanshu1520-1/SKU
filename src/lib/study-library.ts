import {
  SUBJECT_PILLARS,
  type SubjectPillar,
  type MindMapNode,
  type StaticFactMatrix,
  type PyqEvidenceStat,
  type MainsBlueprint,
} from '../data/subject-pillars-data';

export type StudyView = 'notes' | 'explore' | 'writing';
export type StudyResourceKind = 'note' | 'map' | 'reference' | 'exam-note' | 'answer';
export interface StudySubject {
  id: string;
  paper: SubjectPillar['paper'];
  paperLabel: string;
  title: string;
  description: string;
}
type ResourceBase = {
  id: string;
  subjectId: string;
  title: string;
  view: StudyView;
  searchText: string;
  sourceStatus: 'editorial';
};
export type StudyResource = ResourceBase & (
  | { kind: 'note'; content: SubjectPillar['foundationalConcepts'][number] }
  | { kind: 'map'; content: MindMapNode }
  | { kind: 'reference'; content: StaticFactMatrix }
  | { kind: 'exam-note'; content: PyqEvidenceStat }
  | { kind: 'answer'; content: MainsBlueprint }
);
export interface StudySelection { subjectId: string; view: StudyView; itemId: string }

const SUBJECT_COPY: Record<SubjectPillar['paper'], Omit<StudySubject, 'id' | 'paper'>> = {
  GS1: { paperLabel: 'GS I', title: 'History & culture', description: 'Architecture, ideas and movements that shaped India.' },
  GS2: { paperLabel: 'GS II', title: 'Polity & governance', description: 'Understand the Constitution, public institutions and how they work together.' },
  GS3: { paperLabel: 'GS III', title: 'Economy & technology', description: 'Work through monetary policy, economic relationships and scientific systems.' },
  GS4: { paperLabel: 'GS IV', title: 'Ethics & integrity', description: 'Compare ethical approaches and work through decisions in public service.' },
  CSAT: { paperLabel: 'CSAT', title: 'Reasoning & comprehension', description: 'Separate assumptions from inferences and examine the logic of a passage.' },
  STATIC_GK: { paperLabel: 'Reference', title: 'Static reference', description: 'Look up, compare and recall wetlands, places, institutions and other reference facts.' },
};

const NOTE_TITLES: Record<string, string> = {
  'GS2.POL.CONSTITUTION': 'Basic structure & judicial review',
  'GS2.POL.FEDERALISM': 'Centre–state relations',
  'GS2.POL.PARLIAMENT': 'Parliamentary committees',
  'GS2.POL.INSTITUTIONS': 'Constitutional & statutory bodies',
  'GS1.CUL.ARCH': 'Temple architecture',
  'GS1.HIS.FREEDOM': 'Gandhian movements',
  'GS1.CUL.PHILOSOPHY': 'Buddhism & Jainism',
  'GS3.ECO.MONEY_BANK': 'Monetary policy & liquidity',
  'GS3.SCI.NUCLEAR': 'India’s nuclear power programme',
  'GS3.ECO.EXTERNAL_SECTOR': 'Balance of payments',
  'GS4.ETH.DIMENSIONS': 'Duty, consequences & public policy',
  'GS4.ETH.EI': 'Emotional intelligence',
  'CSAT.REASONING': 'Assumptions & inferences',
  'GS3.ENV.CONSERVATION': 'Ramsar & the Montreux Record',
  'GS3.ENV.PROTECTED': 'Protected areas',
};
const MAP_TITLES: Record<string, string> = {
  'mm-amendment': 'How constitutional amendments are passed',
  'mm-writs': 'Choosing the appropriate writ',
  'mm-temples': 'Compare temple styles',
  'mm-freedom-phases': 'The sequence of Gandhian movements',
  'mm-laf': 'Compare RBI liquidity tools',
  'mm-nuclear': 'The three-stage nuclear programme',
  'mm-case-study': 'Work through an ethics case',
  'mm-rc-rules': 'Work through a comprehension question',
  'mm-env-treaties': 'Compare environmental agreements',
  'mm-pa-hierarchy': 'Explore protected-area categories',
};
const TABLE_TITLES: Record<string, string> = {
  'pol-sc-landmarks': 'Landmark Supreme Court judgments',
  'pol-const-vs-statutory': 'Constitutional & statutory bodies',
  'his-classical-dances': 'Classical dances',
  'his-harappan-sites': 'Harappan sites',
  'his-buddhist-councils': 'Buddhist councils',
  'eco-reports-publishers': 'Reports & their publishers',
  'stat-ramsar-matrix': 'Indian Ramsar wetlands',
  'stat-passes-matrix': 'Mountain passes',
  'stat-classical-languages': 'Classical languages',
  'stat-const-amendments': 'Constitutional amendments',
  'stat-biosphere-reserves': 'Biosphere reserves',
};

const paperOrder = ['GS1', 'GS2', 'GS3', 'GS4', 'CSAT', 'STATIC_GK'];
export const STUDY_SUBJECTS: StudySubject[] = SUBJECT_PILLARS
  .map((subject) => ({ id: subject.id, paper: subject.paper, ...SUBJECT_COPY[subject.paper] }))
  .sort((a, b) => paperOrder.indexOf(a.paper) - paperOrder.indexOf(b.paper));

// This adapter presents the local editorial collection, not a canonical syllabus
// graph. AntiG's integration must explicitly map these legacy resource IDs.
export const STUDY_RESOURCES: StudyResource[] = SUBJECT_PILLARS.flatMap((subject) => {
  const base = { subjectId: subject.id, sourceStatus: 'editorial' as const };
  const items: StudyResource[] = [];
  subject.foundationalConcepts.forEach((content) => {
    const title = NOTE_TITLES[content.syllabusTag] || content.title;
    items.push({ ...base, id: `${subject.id}:note:${content.syllabusTag}`, kind: 'note', view: 'notes', title, content,
      searchText: [title, content.title, content.coreTheory, ...content.criticalProvisions, content.examinerPerspective].join(' ') });
  });
  subject.pyqEvidence.forEach((content, index) => {
    items.push({ ...base, id: `${subject.id}:exam-note:${index + 1}`, kind: 'exam-note', view: 'notes',
      title: content.theme, content, searchText: [content.theme, content.examinerTrap].join(' ') });
  });
  subject.mindMaps.forEach((content) => {
    // The legacy protected-area map asserts an unreviewed legal hierarchy.
    // Withhold it rather than turn that claim into an interactive sequence.
    if (content.id === 'mm-pa-hierarchy') return;
    const title = MAP_TITLES[content.id] || content.title;
    items.push({ ...base, id: `${subject.id}:map:${content.id}`, kind: 'map', view: 'explore', title, content,
      searchText: [title, content.title, content.subtitle, content.rootQuestion || '', ...content.details, ...(content.examples || [])].join(' ') });
  });
  (subject.staticMatrices || []).forEach((content) => {
    const title = TABLE_TITLES[content.id] || content.title;
    items.push({ ...base, id: `${subject.id}:reference:${content.id}`, kind: 'reference', view: 'explore', title, content,
      searchText: [title, content.title, content.category, ...content.headers, ...content.rows.flat()].join(' ') });
  });
  // The legacy CSAT blueprint promises "guaranteed qualification" and is not
  // an answer outline. Withhold it pending the content review in AntiG's contract.
  if (subject.paper !== 'CSAT') subject.mainsBlueprints.forEach((content, index) => {
    items.push({ ...base, id: `${subject.id}:answer:${index + 1}`, kind: 'answer', view: 'writing',
      title: content.questionTitle, content,
      searchText: [content.questionTitle, content.structure.introduction, ...content.structure.bodyArguments.flatMap((argument) => [argument.heading, ...argument.points]),
        ...content.structure.statutoryAnchors, content.structure.balancedConclusion].join(' ') });
  });
  return items;
});

export const STUDY_KIND_LABEL: Record<StudyResourceKind, string> = {
  note: 'Concept note', 'exam-note': 'Study pointer', map: 'Concept explorer', reference: 'Reference table', answer: 'Answer outline',
};
export const STUDY_VIEW_LABEL: Record<StudyView, string> = {
  notes: 'Study notes', explore: 'Compare & recall', writing: 'Answer writing',
};

export function resourcesForSubject(subjectId: string, view?: StudyView): StudyResource[] {
  const resources = STUDY_RESOURCES.filter((resource) => resource.subjectId === subjectId && (!view || resource.view === view));
  // The reference collection leads with its lookup tables; explanations remain
  // available alongside them rather than becoming the default entry point.
  return STUDY_SUBJECTS.find((subject) => subject.id === subjectId)?.paper === 'STATIC_GK'
    ? resources.sort((a, b) => Number(b.kind === 'reference') - Number(a.kind === 'reference'))
    : resources;
}
export function searchStudyResources(query: string): StudyResource[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return STUDY_RESOURCES.filter((resource) => {
    const subject = STUDY_SUBJECTS.find((entry) => entry.id === resource.subjectId);
    const text = `${subject?.title} ${subject?.paperLabel} ${resource.searchText}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  }).sort((a, b) => Number(b.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    - Number(a.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
}

export function resolveStudySelection(params: URLSearchParams, preferredSubjectId?: string): StudySelection {
  const subject = STUDY_SUBJECTS.find((entry) => entry.id === params.get('subject'))
    || STUDY_SUBJECTS.find((entry) => entry.id === preferredSubjectId)
    || STUDY_SUBJECTS[0];
  const requestedView = params.get('view');
  let view: StudyView = requestedView === 'notes' || requestedView === 'explore' || requestedView === 'writing'
    ? requestedView : subject.paper === 'STATIC_GK' ? 'explore' : 'notes';
  let resources = resourcesForSubject(subject.id, view);
  if (!resources.length) {
    view = 'notes';
    resources = resourcesForSubject(subject.id, view);
  }
  const item = resources.find((entry) => entry.id === params.get('item')) || resources[0];
  return { subjectId: subject.id, view, itemId: item.id };
}

export function studySelectionForResource(resource: StudyResource): StudySelection {
  return { subjectId: resource.subjectId, view: resource.view, itemId: resource.id };
}
export function getStudyUrl(selection: StudySelection): string {
  const params = new URLSearchParams({ subject: selection.subjectId, view: selection.view, item: selection.itemId });
  return `/library?${params.toString()}`;
}
