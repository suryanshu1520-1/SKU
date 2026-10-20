import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, ChevronDown, RefreshCw, Search, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { normalizeStemMarkdown } from './exam/lib/itemLayout';
import {
  normalizeArchiveTableMarkdown, parseArchive, parseOverview, practicePaper,
  type ArchiveQuestion, type PracticePaper, type PsycheOverview, type TopicRow,
} from '../lib/examiner-psyche-view';
import './ExaminerPsycheModal.css';

interface ExaminerPsycheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPractice?: (subjectCategory: string) => void;
  onNavigateArena?: () => void;
}

const SECTIONS = [
  { id: 'bank', label: 'Question bank' },
  { id: 'formats', label: 'Question formats' },
  { id: 'wording', label: 'Statement wording' },
  { id: 'patterns', label: 'Topic patterns' },
  { id: 'recurring', label: 'Recurring topics' },
  { id: 'csat', label: 'CSAT' },
  { id: 'perspectives', label: 'Answer perspectives' },
  { id: 'directives', label: 'Directives' },
] as const;
type SectionId = typeof SECTIONS[number]['id'];
type RequestState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };
type PracticeAction = (paper: PracticePaper) => void;

async function readResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`The service returned HTTP ${response.status}.`);
  return response.json();
}

function SectionHeading({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return <header className="psyche-section-heading">
    <h3>{title}</h3><p>{children}</p>{note && <p className="psyche-source-note">{note}</p>}
  </header>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="psyche-empty" role="status">{children}</p>;
}

function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <div className="psyche-request-state" role="alert">
    <h3>Couldn’t load this material</h3><p>{message} Try again to request it from the service.</p>
    <button type="button" className="psyche-button" onClick={retry}><RefreshCw size={16} aria-hidden="true" /> Try again</button>
  </div>;
}

function PracticeButton({ paper, onPractice }: { paper: unknown; onPractice?: PracticeAction }) {
  const target = practicePaper(paper);
  if (!target || !onPractice) return null;
  return <button type="button" className="psyche-text-action" onClick={() => onPractice(target)}>
    Subject practice <ArrowRight size={15} aria-hidden="true" />
  </button>;
}

function QuestionEntry({ question }: { question: ArchiveQuestion }) {
  const [showKey, setShowKey] = useState(false);
  const answerId = useId();
  const metadataId = useId();
  const metadata = [question.stage === 'prelims' ? 'Prelims' : 'Mains', question.year?.toString(), question.paper,
    question.marks !== null ? `${question.marks} marks` : '', question.directive].filter(Boolean).join(' · ');
  return <article className="psyche-question" aria-labelledby={metadataId}>
    <p className="psyche-question-meta" id={metadataId}>{metadata}</p>
    <div className="psyche-prompt">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} skipHtml disallowedElements={['img']}
        components={{ table: ({ children }) => <div className="psyche-prompt-table" role="region" aria-label="Question table" tabIndex={0}><table>{children}</table></div> }}>
        {normalizeStemMarkdown(normalizeArchiveTableMarkdown(question.prompt))}
      </ReactMarkdown>
    </div>
    {question.options.length > 0 && <ol className="psyche-options" aria-label="Answer options">
      {question.options.map((option) => <li key={option.key} data-answer={showKey && option.key === question.answerKey || undefined}>
        <span className="psyche-option-key">{option.key}</span><span>{option.text}{showKey && option.key === question.answerKey && <strong className="psyche-answer-label"> Archive key</strong>}</span>
      </li>)}
    </ol>}
    {question.stage === 'prelims' && (question.answerKey ? <>
      <button type="button" className="psyche-text-action" aria-expanded={showKey} aria-controls={answerId} onClick={() => setShowKey((visible) => !visible)}>{showKey ? 'Hide answer key' : 'Reveal answer key'}</button>
      <p id={answerId} className="psyche-key-result" hidden={!showKey} role="status">Answer recorded in the archive: {question.answerKey}</p>
    </> : <p className="psyche-source-note">No answer key is available for this item.</p>)}
    {question.stage === 'mains' && question.notes.length > 0 && <details className="psyche-preparation-notes">
      <summary>Preparation notes <ChevronDown size={16} aria-hidden="true" /></summary><p className="psyche-source-note">Editorial notes stored with this question.</p>
      <ul>{question.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
    </details>}
  </article>;
}

function RelatedQuestions({ nodeId }: { nodeId: string }) {
  const [request, setRequest] = useState<RequestState<ArchiveQuestion[]>>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [stage, setStage] = useState('all');
  const [year, setYear] = useState('all');
  const filterId = useId();
  useEffect(() => {
    const controller = new AbortController();
    setRequest({ status: 'loading' });
    fetch(`/api/analytics/examiner-psyche/node/${encodeURIComponent(nodeId)}`, { signal: controller.signal })
      .then(readResponse).then(parseArchive)
      .then((data) => { if (!controller.signal.aborted) setRequest({ status: 'ready', data }); })
      .catch(() => { if (!controller.signal.aborted) setRequest({ status: 'error', message: 'The question archive is unavailable right now.' }); });
    return () => controller.abort();
  }, [nodeId, revision]);
  if (request.status === 'loading') return <p className="psyche-loading" role="status">Loading archive questions…</p>;
  if (request.status === 'error') return <Failure message={request.message} retry={() => setRevision((value) => value + 1)} />;
  const questions = request.data;
  if (!questions.length) return <EmptyState>No archive questions were returned for this topic.</EmptyState>;
  const years = [...new Set(questions.flatMap((question) => question.year === null ? [] : [question.year]))].sort((a, b) => b - a);
  const filtered = questions.filter((question) => (stage === 'all' || question.stage === stage) && (year === 'all' || String(question.year) === year));
  return <div className="psyche-archive">
    <header><h4>Archive questions</h4><p className="psyche-source-note">Topic associations and archive coverage are under review. This selection can include loosely matched items; inspect each question before treating it as evidence for this topic.</p></header>
    <div className="psyche-filter-row">
      <label htmlFor={`${filterId}-stage`}>Stage<select id={`${filterId}-stage`} value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">All stages</option><option value="prelims">Prelims</option><option value="mains">Mains</option></select></label>
      <label htmlFor={`${filterId}-year`}>Year<select id={`${filterId}-year`} value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All returned years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <p role="status">{filtered.length} of {questions.length} returned questions</p>
    </div>
    {filtered.length ? filtered.map((question) => <QuestionEntry key={`${question.stage}-${question.id}-${stage}-${year}`} question={question} />) : <EmptyState>No returned questions match this year and stage. Try another filter.</EmptyState>}
  </div>;
}

function TopicEntry({ topic, onPractice }: { topic: TopicRow; onPractice?: PracticeAction }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const details = [topic.paper, topic.prelims !== null ? `${topic.prelims} Prelims recorded` : '', topic.mains !== null ? `${topic.mains} Mains recorded` : '', topic.lastYear !== null ? `Last recorded: ${topic.lastYear}` : ''].filter(Boolean).join(' · ');
  return <details className="psyche-topic" onToggle={(event) => setIsExpanded(event.currentTarget.open)}>
    <summary><span><strong>{topic.title}</strong>{details && <small>{details}</small>}</span><ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="psyche-topic-body"><div className="psyche-topic-actions"><span className="psyche-node-id">{topic.id}</span><PracticeButton paper={topic.paper} onPractice={onPractice} /></div>{isExpanded && <RelatedQuestions nodeId={topic.id} />}</div>
  </details>;
}

function QuestionBank({ data, onPractice }: { data: PsycheOverview; onPractice?: PracticeAction }) {
  const maximum = Math.max(1, ...data.subjects.map((subject) => subject.count));
  return <>
    <SectionHeading title="Question bank" note="Counts reflect available subject classifications and may cover only part of the question bank. They do not measure exam weightage.">See how the question bank is grouped, then open an existing subject practice pool.</SectionHeading>
    {data.subjects.length ? <ul className="psyche-bank-list">{data.subjects.map((subject, index) => <li key={`${subject.subject}-${index}`}>
      <div className="psyche-bank-subject"><h4>{subject.subject}</h4><span><strong>{subject.count.toLocaleString()}</strong> questions</span></div>
      <div className="psyche-count-bar" aria-hidden="true"><span style={{ width: `${subject.count / maximum * 100}%` }} /></div>
      <div className="psyche-bank-detail">{subject.focus && <p><span>Study focus: </span>{subject.focus}</p>}<PracticeButton paper={subject.paper} onPractice={onPractice} /></div>
    </li>)}</ul> : <EmptyState>No subject distribution was returned by the analytics service.</EmptyState>}
    {data.subjects.length > 0 && <p className="psyche-source-note">Bar lengths compare the returned counts with the largest subject group. Practice uses a broad subject pool.</p>}
  </>;
}

function QuestionFormats({ data }: { data: PsycheOverview }) {
  return <><SectionHeading title="Question formats" note="Editorial preparation guidance supplied by the analytics service.">Understand changes in question structure and what they ask of your preparation.</SectionHeading>
    {data.formats.length ? <div className="psyche-format-list">{data.formats.map((format, index) => <article key={`${format.title}-${index}`}><h4>{format.span || format.title}</h4><div><p className="psyche-format-pivot">{format.pivot || format.title}</p>{format.takeaway && <p>{format.takeaway}</p>}</div></article>)}</div> : <EmptyState>No question-format guidance was returned.</EmptyState>}
  </>;
}

function StatementWording({ data }: { data: PsycheOverview }) {
  return <><SectionHeading title="Statement wording" note="Only token rows with a positive statement sample are shown. Samples can overlap when a statement contains several tokens.">Compare wording within decoded factual statements. A qualifier alone cannot determine an answer.</SectionHeading>
    {data.qualifiers.length ? <>{(['absolute', 'qualified'] as const).map((group) => {
      const rows = data.qualifiers.filter((row) => row.group === group);
      return rows.length > 0 && <section className="psyche-wording-group" key={group}><h4>{group === 'absolute' ? 'Absolute wording' : 'Qualified wording'}</h4>
        <div className="psyche-table-scroll" role="region" aria-label={`${group === 'absolute' ? 'Absolute' : 'Qualified'} wording samples`} tabIndex={0}><table>
          <thead><tr><th scope="col">Token</th><th scope="col">Statements</th><th scope="col">True in sample</th><th scope="col">False in sample</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${row.token}-${index}`}><th scope="row">{row.token}</th><td>{row.sampleSize.toLocaleString()}</td><td>{row.truePct === null ? 'Unavailable' : `${row.truePct}%`}</td><td>{row.falsePct === null ? 'Unavailable' : `${row.falsePct}%`}</td></tr>)}</tbody>
        </table></div></section>;
    })}<aside className="psyche-reading-note"><h4>Read the claim before the qualifier</h4><p>“Only” in an answer label such as “1 only” selects a statement. It does not make the factual statement absolute. Check the scope, conditions and exceptions in the statement itself.</p></aside></> : <EmptyState>No wording rows with a positive sample size were returned.</EmptyState>}
  </>;
}

function TopicPatterns({ data, onPractice }: { data: PsycheOverview; onPractice?: PracticeAction }) {
  const [group, setGroup] = useState<'core' | 'dormant'>('core');
  const [paper, setPaper] = useState('all');
  const [query, setQuery] = useState('');
  const filterId = useId();
  const topics = group === 'core' ? data.coreTopics : data.dormantTopics;
  const papers = [...new Set([...data.coreTopics, ...data.dormantTopics].map((topic) => topic.paper).filter(Boolean))].sort();
  const visible = useMemo(() => topics.filter((topic) => (paper === 'all' || topic.paper === paper) && (!query.trim() || `${topic.title} ${topic.id}`.toLowerCase().includes(query.trim().toLowerCase()))), [topics, paper, query]);
  return <><SectionHeading title="Topic patterns" note="Topic associations and archive coverage are under review. Last-recorded years describe available records and do not predict the next paper.">Inspect represented topics and archive gaps, then read archive questions for context.</SectionHeading>
    <div className="psyche-subnav" role="group" aria-label="Topic list"><button type="button" aria-pressed={group === 'core'} onClick={() => setGroup('core')}>Represented topics</button><button type="button" aria-pressed={group === 'dormant'} onClick={() => setGroup('dormant')}>Archive gaps</button></div>
    <div className="psyche-filter-row psyche-topic-filters"><label htmlFor={`${filterId}-paper`}>Paper<select id={`${filterId}-paper`} value={paper} onChange={(event) => setPaper(event.target.value)}><option value="all">All returned papers</option>{papers.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="psyche-search-label" htmlFor={`${filterId}-search`}>Find a topic<span className="psyche-search-field"><Search size={16} aria-hidden="true" /><input id={`${filterId}-search`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Topic or node reference" /></span></label>
    </div><p className="psyche-result-count" role="status">{visible.length} {visible.length === 1 ? 'topic' : 'topics'} in this view</p>
    {visible.length ? <div className="psyche-topic-list">{visible.map((topic, index) => <TopicEntry key={`${group}-${topic.id}-${index}`} topic={topic} onPractice={onPractice} />)}</div> : <EmptyState>{topics.length ? 'No returned topics match these filters. Try another paper or search term.' : 'No topics were returned for this list.'}</EmptyState>}
  </>;
}

function RecurringTopics({ data, onPractice }: { data: PsycheOverview; onPractice?: PracticeAction }) {
  return <><SectionHeading title="Recurring topics" note="An editorial selection of themes to revisit. Topic associations are under review; no recurrence schedule or forecast is implied.">Revisit familiar statutory and conceptual boundaries through archive questions.</SectionHeading>
    {data.recurringTopics.length ? <div className="psyche-topic-list">{data.recurringTopics.map((topic, index) => <TopicEntry key={`${topic.id}-${index}`} topic={{ ...topic, prelims: null, mains: null, lastYear: null }} onPractice={onPractice} />)}</div> : <EmptyState>No recurring-topic guidance was returned.</EmptyState>}
  </>;
}

function CsatPreparation({ data, onPractice }: { data: PsycheOverview; onPractice?: PracticeAction }) {
  return <><SectionHeading title="CSAT" note="Editorial preparation guidance, without a measured question-share claim.">Work through comprehension, quantitative reasoning and logical constraints.</SectionHeading>
    {data.csat.length ? <div className="psyche-guidance-list">{data.csat.map((guide) => <article key={guide.title}><h4>{guide.title}</h4>{guide.focus && <p>{guide.focus}</p>}{guide.approach && <p className="psyche-guidance-detail">{guide.approach}</p>}</article>)}</div> : <EmptyState>No CSAT guidance was returned.</EmptyState>}
    <PracticeButton paper="CSAT" onPractice={onPractice} />
  </>;
}

function AnswerPerspectives({ data }: { data: PsycheOverview }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectId = useId();
  const guide = data.perspectives[selectedIndex] || data.perspectives[0];
  return <><SectionHeading title="Answer perspectives" note="Editorial frameworks for practice. These are not official model answers or marking schemes.">Consider two perspectives, then build a reasoned answer that responds to both.</SectionHeading>
    {guide ? <><label className="psyche-guide-select" htmlFor={selectId}>Choose a perspective<select id={selectId} value={selectedIndex} onChange={(event) => setSelectedIndex(Number(event.target.value))}>{data.perspectives.map((item, index) => <option key={`${item.title}-${index}`} value={index}>{item.title}</option>)}</select></label>
      <article className="psyche-perspective" key={guide.title}><h4>{guide.title}</h4>{guide.papers.length > 0 && <p className="psyche-source-note">Preparation context: {guide.papers.join(' · ')}</p>}
        <div className="psyche-perspective-pair"><section><h5>Perspective A</h5><p>{guide.thesis || 'No first perspective was returned.'}</p></section><section><h5>Perspective B</h5><p>{guide.antithesis || 'No second perspective was returned.'}</p></section></div>
        {guide.synthesis && <section className="psyche-synthesis"><h5>Bring the perspectives together</h5><p>{guide.synthesis}</p></section>}
      </article></> : <EmptyState>No answer-perspective guidance was returned.</EmptyState>}
  </>;
}

function Directives({ data }: { data: PsycheOverview }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectId = useId();
  const guide = data.directives[selectedIndex] || data.directives[0];
  return <><SectionHeading title="Directives" note="Editorial answer-planning guidance. No prescribed mark allocation or official scoring rubric is asserted.">Let the command word shape your structure, evidence and conclusion.</SectionHeading>
    {guide ? <><label className="psyche-guide-select" htmlFor={selectId}>Choose a directive<select id={selectId} value={selectedIndex} onChange={(event) => setSelectedIndex(Number(event.target.value))}>{data.directives.map((item, index) => <option key={`${item.title}-${index}`} value={index}>{item.title}</option>)}</select></label>
      <article className="psyche-directive" key={guide.title}><h4>{guide.title}</h4>{guide.intent && <p>{guide.intent}</p>}{guide.steps.length > 0 && <section><h5>Build your answer</h5><ol>{guide.steps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol></section>}
        {guide.pitfall && <aside className="psyche-reading-note"><h5>Avoid this common weakness</h5><p>{guide.pitfall}</p></aside>}
      </article></> : <EmptyState>No directive guidance was returned.</EmptyState>}
  </>;
}

export function ExaminerPsycheModal({ isOpen, onClose, onLaunchPractice, onNavigateArena }: ExaminerPsycheModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [activeSection, setActiveSection] = useState<SectionId>('bank');
  const [request, setRequest] = useState<RequestState<PsycheOverview>>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const instanceId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setRequest({ status: 'loading' });
    fetch('/api/analytics/examiner-psyche/overview', { signal: controller.signal })
      .then(readResponse).then(parseOverview)
      .then((data) => { if (!controller.signal.aborted) setRequest({ status: 'ready', data }); })
      .catch(() => { if (!controller.signal.aborted) setRequest({ status: 'error', message: 'The examiner analytics service is unavailable right now.' }); });
    return () => controller.abort();
  }, [isOpen, revision]);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [activeSection]);
  function handleSectionKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % SECTIONS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + SECTIONS.length - 1) % SECTIONS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = SECTIONS.length - 1;
    else return;
    event.preventDefault(); setActiveSection(SECTIONS[nextIndex].id); navRefs.current[nextIndex]?.focus();
    navRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function handleDialogKeys(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    const dialog = event.currentTarget;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]',
    )).filter((element) => element.tabIndex >= 0
      && element.getClientRects().length > 0
      && getComputedStyle(element).visibility !== 'hidden'
      && !element.closest('[inert], [aria-hidden="true"]'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const activeElement = document.activeElement;
    if ((event.shiftKey && activeElement === first) || (!event.shiftKey && activeElement === last) || !dialog.contains(activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }
  const launchPractice: PracticeAction | undefined = onLaunchPractice ? (paper) => { onClose(); onLaunchPractice(paper); } : undefined;
  if (!isOpen) return null;
  const ready = request.status === 'ready' ? request.data : null;
  let sectionContent: ReactNode = null;
  if (ready) {
    switch (activeSection) {
      case 'bank': sectionContent = <QuestionBank data={ready} onPractice={launchPractice} />; break;
      case 'formats': sectionContent = <QuestionFormats data={ready} />; break;
      case 'wording': sectionContent = <StatementWording data={ready} />; break;
      case 'patterns': sectionContent = <TopicPatterns data={ready} onPractice={launchPractice} />; break;
      case 'recurring': sectionContent = <RecurringTopics data={ready} onPractice={launchPractice} />; break;
      case 'csat': sectionContent = <CsatPreparation data={ready} onPractice={launchPractice} />; break;
      case 'perspectives': sectionContent = <AnswerPerspectives data={ready} />; break;
      case 'directives': sectionContent = <Directives data={ready} />; break;
    }
  }
  return <dialog ref={dialogRef} className="psyche-dialog" aria-labelledby={`${instanceId}-title`} aria-describedby={`${instanceId}-description`} onKeyDown={handleDialogKeys}
    onCancel={(event) => { event.preventDefault(); onCloseRef.current(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCloseRef.current();
    }}>
    <div className="psyche-dialog-layout">
      <header className="psyche-header"><div><h2 id={`${instanceId}-title`}>The Examiner’s Psyche</h2><p id={`${instanceId}-description`}>Explore question patterns and preparation guidance.</p></div><button className="psyche-close" type="button" onClick={onClose} aria-label="Close Examiner’s Psyche" autoFocus><X size={20} aria-hidden="true" /></button></header>
      <div className="psyche-navigation">
        <div className="psyche-section-tabs" role="tablist" aria-label="Examiner’s Psyche sections">{SECTIONS.map((section, index) => <button type="button" key={section.id} role="tab" id={`${instanceId}-tab-${section.id}`} aria-controls={`${instanceId}-panel`} aria-selected={activeSection === section.id} tabIndex={activeSection === section.id ? 0 : -1} ref={(element) => { navRefs.current[index] = element; }} onClick={() => setActiveSection(section.id)} onKeyDown={(event) => handleSectionKeys(event, index)}>{section.label}</button>)}</div>
        <label className="psyche-mobile-section" htmlFor={`${instanceId}-section`}>Section<select id={`${instanceId}-section`} value={activeSection} onChange={(event) => setActiveSection(event.target.value as SectionId)}>{SECTIONS.map((section) => <option value={section.id} key={section.id}>{section.label}</option>)}</select></label>
      </div>
      <div ref={contentRef} className="psyche-content" id={`${instanceId}-panel`} role="tabpanel" aria-labelledby={`${instanceId}-tab-${activeSection}`} tabIndex={0} aria-busy={request.status === 'loading'}>
        {request.status === 'loading' ? <div className="psyche-request-state" role="status"><h3>Loading the examiner’s study material…</h3><p>Requesting analytics and preparation guidance.</p><div className="psyche-loading-rule" aria-hidden="true" /></div> : request.status === 'error' ? <Failure message={request.message} retry={() => setRevision((value) => value + 1)} /> : sectionContent}
      </div>
      <footer className="psyche-footer"><p>Read patterns in context. Test your understanding through practice.</p><div>{onNavigateArena && <button type="button" className="psyche-text-action" onClick={() => { onClose(); onNavigateArena(); }}>Open Test Arena <ArrowRight size={15} aria-hidden="true" /></button>}<button type="button" className="psyche-button" onClick={onClose}>Close</button></div></footer>
    </div>
  </dialog>;
}
