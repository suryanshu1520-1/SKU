/** Read-only view models for the existing examiner analytics responses. */
export type PracticePaper = 'GS1' | 'GS2' | 'GS3' | 'CSAT' | 'STATIC_GK';
export type JsonRecord = Record<string, unknown>;

export function record(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}
export function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Recover GFM row boundaries lost by the legacy archive's whitespace collapse.
 * A real separator and matching column counts are required; prose stays intact.
 */
export function normalizeArchiveTableMarkdown(prompt: string): string {
  if (prompt.includes('\n')) return prompt;
  const separator = /\|(?:\s*:?-{3,}:?\s*\|){2,}/.exec(prompt);
  if (!separator) return prompt;
  const columns = separator[0].split('|').length - 2;
  if (columns < 2 || columns > 8) return prompt;
  const before = prompt.slice(0, separator.index).trimEnd();
  const header = new RegExp('\\|(?:[^|\\n]*\\|){' + columns + '}\\s*$').exec(before);
  if (!header) return prompt;
  const rowPattern = new RegExp('^\\s*(\\|(?:[^|\\n]*\\|){' + columns + '})');
  let remaining = prompt.slice(separator.index + separator[0].length);
  const rows: string[] = [];
  for (let index = 0; index < 100; index += 1) {
    const row = rowPattern.exec(remaining);
    if (!row) break;
    rows.push(row[1].trim());
    remaining = remaining.slice(row[0].length);
  }
  if (!rows.length || rowPattern.test(remaining)) return prompt;
  return [before.slice(0, header.index).trimEnd(), '', header[0].trim(), separator[0], ...rows, '', remaining.trimStart()]
    .join('\n').trim();
}
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function percentage(value: unknown): number | null {
  const result = numberValue(value);
  return result !== null && result <= 100 ? result : null;
}
function yearValue(value: unknown): number | null {
  const year = numberValue(value);
  return year !== null && Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() ? year : null;
}
export function practicePaper(value: unknown): PracticePaper | null {
  const paper = textValue(value).toUpperCase().replace(/[\s-]/g, '');
  return ['GS1', 'GS2', 'GS3', 'CSAT', 'STATIC_GK'].includes(paper) ? paper as PracticePaper : null;
}
/** Strip numerical claims from editorial preparation text, not from questions. */
function guidance(value: unknown): string {
  return textValue(value)
    .replace(/\([^)]*(?:\d[\d.]*\s*%|avg\s+\d)[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
}

export interface DistributionRow { subject: string; count: number; paper: PracticePaper | null; focus: string }
export interface FormatGuide { title: string; span: string; pivot: string; takeaway: string }
export interface QualifierRow { token: string; sampleSize: number; truePct: number | null; falsePct: number | null; group: 'absolute' | 'qualified' }
export interface TopicRow { id: string; title: string; paper: string; prelims: number | null; mains: number | null; lastYear: number | null }
export interface RecurringTopic { id: string; title: string; paper: string }
export interface CsatGuide { title: string; focus: string; approach: string }
export interface PerspectiveGuide { title: string; papers: string[]; thesis: string; antithesis: string; synthesis: string }
export interface DirectiveGuide { title: string; intent: string; steps: string[]; pitfall: string }
export interface PsycheOverview {
  subjects: DistributionRow[];
  formats: FormatGuide[];
  qualifiers: QualifierRow[];
  coreTopics: TopicRow[];
  dormantTopics: TopicRow[];
  recurringTopics: RecurringTopic[];
  csat: CsatGuide[];
  perspectives: PerspectiveGuide[];
  directives: DirectiveGuide[];
}

export function parseOverview(payload: unknown): PsycheOverview {
  const envelope = record(payload);
  const data = record(envelope.data);
  const sectionKeys = ['bankTrends', 'paretoDrought', 'qualifiers', 'formatShifts', 'cicadaTopics', 'csatAnatomy', 'dialecticalAxes', 'directiveRubrics'];
  if (envelope.success !== true || !sectionKeys.some((key) => data[key] !== null && typeof data[key] === 'object')) {
    throw new Error('The analytics service returned an unreadable response.');
  }
  const bank = record(data.bankTrends);
  const patterns = record(data.paretoDrought);
  const wording = record(data.qualifiers);
  const csat = record(data.csatAnatomy);
  const topics = (value: unknown): TopicRow[] => list(value).flatMap((item) => {
    const row = record(item);
    const id = textValue(row.nodeId);
    if (!id) return [];
    return [{ id, title: textValue(row.gloss) || id, paper: textValue(row.paper), prelims: numberValue(row.totalPrelims), mains: numberValue(row.totalMains), lastYear: yearValue(row.lastTestedYear) }];
  });
  const qualifierRows = (value: unknown, group: QualifierRow['group']): QualifierRow[] => list(value).flatMap((item) => {
    const row = record(item);
    const token = textValue(row.token);
    const sampleSize = numberValue(row.sampleSize);
    if (!token || sampleSize === null || !Number.isInteger(sampleSize) || sampleSize < 1) return [];
    return [{ token, sampleSize, group, truePct: percentage(row.trueStatementPct), falsePct: percentage(row.falseStatementPct) }];
  });
  return {
    subjects: list(bank.subjectDistribution).flatMap((item) => {
      const row = record(item);
      const subject = textValue(row.subject);
      const count = numberValue(row.count);
      return subject && count !== null && Number.isInteger(count) ? [{ subject, count, paper: practicePaper(row.pillar), focus: guidance(row.highYieldFocus) }] : [];
    }),
    formats: list(data.formatShifts).flatMap((item) => {
      const row = record(item);
      const title = textValue(row.era);
      return title ? [{ title, span: textValue(row.yearSpan), pivot: guidance(row.structuralPivot), takeaway: guidance(row.pedagogicalTakeaway) }] : [];
    }),
    qualifiers: [...qualifierRows(wording.extremeQualifiers, 'absolute'), ...qualifierRows(wording.contingentQualifiers, 'qualified')],
    coreTopics: topics(patterns.paretoCoreNodes),
    dormantTopics: topics(patterns.droughtNodes),
    recurringTopics: list(data.cicadaTopics).flatMap((item) => {
      const row = record(item);
      const id = textValue(row.nodeId);
      const title = textValue(row.topic);
      // Historical year lists and cycle claims here are static, not archive results.
      return id && title ? [{ id, title, paper: textValue(row.pillar) }] : [];
    }),
    csat: [
      { key: 'readingComprehension', title: 'Reading comprehension', focusKey: 'dominantQuestionType', approachKey: 'examinerTrapProfile' },
      { key: 'quantitativeAptitude', title: 'Quantitative aptitude', focusKey: 'coreFocusAreas', approachKey: 'pacingProfile' },
      { key: 'logicalReasoning', title: 'Logical reasoning', focusKey: 'coreFocusAreas', approachKey: 'pacingProfile' },
    ].flatMap(({ key, title, focusKey, approachKey }) => {
      const row = record(csat[key]);
      const focus = guidance(row[focusKey]);
      const approach = guidance(row[approachKey]);
      return focus || approach ? [{ title, focus, approach }] : [];
    }),
    perspectives: list(data.dialecticalAxes).flatMap((item) => {
      const row = record(item);
      const title = textValue(row.title);
      return title ? [{ title, papers: list(row.recurrentPapers).map(textValue).filter(Boolean), thesis: guidance(row.thesis), antithesis: guidance(row.antithesis), synthesis: guidance(row.synthesisFramework) }] : [];
    }),
    directives: list(data.directiveRubrics).flatMap((item) => {
      const row = record(item);
      const title = textValue(row.directive);
      const blueprint = list(row.markAllocationBlueprint).map((part) => guidance(record(part).component)).filter(Boolean);
      return title ? [{ title, intent: guidance(row.coreIntent), steps: blueprint.length ? blueprint : list(row.expectedDimensions).map(guidance).filter(Boolean), pitfall: guidance(row.examinerPenaltyPitfall) }] : [];
    }),
  };
}

export interface ArchiveQuestion {
  id: string;
  stage: 'prelims' | 'mains';
  year: number | null;
  paper: string;
  prompt: string;
  options: { key: string; text: string }[];
  answerKey: string;
  marks: number | null;
  directive: string;
  notes: string[];
}

export function parseArchive(payload: unknown): ArchiveQuestion[] {
  const envelope = record(payload);
  const data = record(envelope.data);
  if (envelope.success !== true || (!Array.isArray(data.prelimsQuestions) && !Array.isArray(data.mainsQuestions))) {
    throw new Error('The question archive returned an unreadable response.');
  }
  const rows = (value: unknown, stage: ArchiveQuestion['stage']): ArchiveQuestion[] => list(value).flatMap((item, index) => {
    const row = record(item);
    const prompt = textValue(stage === 'prelims' ? row.stem : row.prompt);
    if (!prompt) return [];
    const rawOptions = Array.isArray(row.options)
      ? row.options.map((value, optionIndex) => [String.fromCharCode(65 + optionIndex), value] as const)
      : Object.entries(record(row.options));
    const options = rawOptions.flatMap(([key, value]) => {
      const text = textValue(value);
      return text ? [{ key: key.toUpperCase(), text }] : [];
    });
    if (stage === 'prelims' && options.some((option) => /^(?:\(?[a-d]\)?[.\s]*)?Option\s*[A-D]$/i.test(option.text))) return [];
    const rawKey = textValue(row.official_key).toUpperCase();
    const keyMatch = rawKey.match(/^(?:\(?([A-D])\)?[.]?)$/);
    const answerKey = keyMatch?.[1] || '';
    return [{
      id: textValue(row.id) || `${stage}-${index}`,
      stage, year: yearValue(row.year), paper: textValue(row.paper), prompt, options,
      answerKey: options.some((option) => option.key === answerKey) ? answerKey : '',
      marks: numberValue(row.marks), directive: textValue(row.directive_verb),
      notes: [row.rubric_level_1, row.rubric_level_2, row.rubric_level_3].map(textValue).filter(Boolean),
    }];
  });
  return [...rows(data.prelimsQuestions, 'prelims'), ...rows(data.mainsQuestions, 'mains')];
}
