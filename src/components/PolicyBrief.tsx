import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Bookmark, BookOpen, ChevronDown, ExternalLink, Share2, ShieldCheck, Target, X, ShieldAlert, Flame, GitFork } from 'lucide-react';
import { getDispatchOperator, type CurrentAffairsItem, type ParsedSyllabusTag } from './CurrentAffairs';
import { matchDispatchToPolicyChain, getVolcanoTelemetryForNode } from '../lib/policy-ripple-radar-shared';
import { EXAMINER_OPERATORS, type ExaminerOperatorType } from '../types';
import { ContestedCard, SourceAnchor } from './TrustUI';
import { TheHinduLogo, PibLogo } from './SourceLogos';
import { getCanonicalArticleUrl } from '../lib/seo';
import { getArticleNodalSwapRisk, getStoredVulnerabilityIndex } from '../lib/vulnerabilityIndex';
import './PolicyBrief.css';

interface PolicyBriefProps {
  item: CurrentAffairsItem;
  syllabusTags: ParsedSyllabusTag[];
  saved: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onShare: () => void;
  onPractice?: () => void;
  onLaunchConveyor?: () => void;
  onInspectGrounding: () => void;
}

const sections = [
  { id: 'revision', label: 'Exam notes' },
  { id: 'analysis', label: 'Mains analysis' },
  { id: 'connections', label: 'Connections' },
  { id: 'evidence', label: 'Evidence' },
] as const;
type SectionId = typeof sections[number]['id'];

const examFocusLabels: Record<ExaminerOperatorType, string> = {
  PSY_01_INST_SWAP: 'Institutions & responsibilities',
  PSY_02_QUAL_POLARITY: 'Conditions & qualifiers',
  PSY_03_LEGAL_TIER: 'Legal status',
  PSY_04_CAUSAL_INV: 'Cause, effect & sequence',
  PSY_05_SCOPE_MUTATE: 'Numbers, scope & trends',
  PSY_06_PAIR_DECOY: 'Matched pairs',
  PSY_07_TRUE_NON_CAUSAL: 'Assertion & explanation',
};

function NoteSection({ id, title, children }: { id: SectionId; title: string; children: ReactNode }) {
  return (
    <section id={`brief-${id}`} className="brief-section" aria-labelledby={`brief-${id}-heading`}>
      <h3 id={`brief-${id}-heading`} tabIndex={-1}>{title}</h3>
      {children}
    </section>
  );
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return <div className="brief-note"><h4>{title}</h4>{children}</div>;
}

export default function PolicyBrief({ item, syllabusTags, saved, saving, onClose, onSave, onShare, onPractice, onLaunchConveyor, onInspectGrounding }: PolicyBriefProps) {
  const summary = item.summary;
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const [activeSection, setActiveSection] = useState<SectionId>('revision');
  const canonicalUrl = getCanonicalArticleUrl(item);
  const operator = getDispatchOperator(item);
  const operatorMeta = EXAMINER_OPERATORS[operator];
  const examFocus = examFocusLabels[operator];
  const historicalTwin = item.historical_twin;
  const nodalRisk = getArticleNodalSwapRisk(item, getStoredVulnerabilityIndex());
  const policyChain = matchDispatchToPolicyChain(item.headline, item.ministry, summary?.bullets?.join(' '), item.chain_id);
  const volcano = getVolcanoTelemetryForNode(item.node_id, item.headline, item.ministry);
  const resurgingTopic = volcano?.volcano_status === 'ERUPTING' ? volcano : null;
  const syllabusPapers = Array.from(new Set(syllabusTags.map(tag => tag.paper)));
  const singleSyllabusTopic = syllabusTags.length === 1 ? `${syllabusTags[0].paper} · ${syllabusTags[0].topic}` : '';
  const syllabusOverview = singleSyllabusTopic && singleSyllabusTopic.length <= 48
    ? singleSyllabusTopic
    : `${syllabusTags.length} ${syllabusTags.length === 1 ? 'topic' : 'topics'} · ${syllabusPapers.join(', ')}`;
  const articleDate = item.created_at ? new Date(item.created_at) : null;
  const validDate = articleDate && Number.isFinite(articleDate.getTime()) ? articleDate : null;
  const targets = [
    { label: 'Key data', value: summary?.revision_targets?.data_metric },
    { label: 'Nodal agency', value: summary?.revision_targets?.nodal_body },
    { label: 'Statutory / legal', value: summary?.revision_targets?.statutory_legal },
  ].filter(target => target.value);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      // Source popovers and the grounding explainer have their own focus scope.
      if (!dialog || !dialog.contains(document.activeElement)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCallback.current();
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, [tabindex="0"]',
      )).filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const updateActiveSection = () => {
    const reader = readerRef.current;
    if (!reader) return;
    const threshold = reader.getBoundingClientRect().top + (navRef.current?.offsetHeight || 0) + 48;
    let current: SectionId = 'revision';
    for (const section of sections) {
      const element = reader.querySelector(`#brief-${section.id}`);
      if (element && element.getBoundingClientRect().top <= threshold) current = section.id;
    }
    if (reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 2) current = 'evidence';
    setActiveSection(current);
  };

  const jumpTo = (id: SectionId) => {
    const reader = readerRef.current;
    const section = reader?.querySelector<HTMLElement>(`#brief-${id}`);
    if (!reader || !section) return;
    const top = section.getBoundingClientRect().top - reader.getBoundingClientRect().top
      + reader.scrollTop - (navRef.current?.offsetHeight || 0) - 24;
    section.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    reader.scrollTo({ top, behavior: reducedMotion ? 'instant' : 'smooth' });
    setActiveSection(id);
  };

  return createPortal(
    <motion.div
      className="brief-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby="brief-title"
        className="policy-brief"
        initial={reducedMotion ? { opacity: 0 } : { x: '100%' }}
        animate={{ x: 0, opacity: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 36 }}
      >
        <div className="brief-toolbar">
          <span className="brief-toolbar-title"><BookOpen size={17} aria-hidden="true" /> Study brief</span>
          <div className="brief-toolbar-actions">
            <button type="button" className="brief-action" onClick={onShare}>
              <Share2 size={16} aria-hidden="true" /><span>Copy link</span>
            </button>
            <button ref={closeRef} type="button" className="brief-icon-action" onClick={onClose} aria-label="Close study brief">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div ref={readerRef} className="brief-reader" onScroll={updateActiveSection}>
          <header className="brief-header">
            <div className="brief-byline">
              {item.source?.toUpperCase().includes('HINDU') ? (
                <span title="The Hindu"><TheHinduLogo height={15} color="var(--text-primary)" /></span>
              ) : item.source?.toUpperCase().includes('PIB') ? (
                <span className="brief-source"><PibLogo size={18} /> PIB Official</span>
              ) : <span className="brief-source">{item.source}</span>}
              {validDate && <time dateTime={validDate.toISOString()}>{validDate.toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
              })}</time>}
            </div>
            <h2 id="brief-title">{item.headline}</h2>
            {item.ministry && <p className="brief-ministry">{item.ministry}</p>}

            <div className="brief-study-meta">
              {(summary?.prelims_relevance || summary?.mains_relevance) && <dl className="brief-relevance" aria-label="Exam relevance">
                {summary.prelims_relevance && <div><dt>Prelims</dt><dd>{summary.prelims_relevance.toLowerCase()}</dd></div>}
                {summary.mains_relevance && <div><dt>Mains</dt><dd>{summary.mains_relevance.toLowerCase()}</dd></div>}
              </dl>}
              <button type="button" className="brief-evidence-access" onClick={onInspectGrounding}>
                <ShieldCheck size={15} strokeWidth={1.6} aria-hidden="true" />
                <span>Sources & verification</span>
                <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
              </button>
            </div>

            {syllabusTags.length > 0 && (
              <details className="brief-disclosure brief-syllabus">
                <summary>
                  <span className="brief-disclosure-label">Syllabus</span>
                  <span className="brief-disclosure-preview">{syllabusOverview}</span>
                  <ChevronDown size={16} strokeWidth={1.6} aria-hidden="true" />
                </summary>
                <div className="brief-syllabus-full">
                  <h4>UPSC syllabus mapping</h4>
                  <ul>{syllabusTags.map((tag, index) => <li key={index}>{tag.full}</li>)}</ul>
                </div>
              </details>
            )}

            <details className="brief-disclosure brief-study-connections">
              <summary>
                <span className="brief-disclosure-label">Study connections</span>
                <span className="brief-disclosure-preview">{policyChain ? 'Exam focus & policy chain' : 'Exam focus'}</span>
                <ChevronDown size={16} strokeWidth={1.6} aria-hidden="true" />
              </summary>
              <dl className="brief-connection-list">
                <div>
                  <dt><Target size={16} strokeWidth={1.6} aria-hidden="true" />Exam focus</dt>
                  <dd>
                    <strong>{examFocus}</strong>
                    <p>{operatorMeta.description}</p>
                    {!item.primary_operator && <span className="brief-connection-note">Suggested by article text</span>}
                  </dd>
                </div>
                {policyChain && <div>
                  <dt><GitFork size={16} strokeWidth={1.6} aria-hidden="true" />Policy chain</dt>
                  <dd>
                    <strong>{policyChain.title}</strong>
                    {typeof item.ring_depth === 'number' && Number.isFinite(item.ring_depth) && <p>Connection depth: {item.ring_depth}</p>}
                    <a href={`/observatory?tab=ripple&chain=${encodeURIComponent(policyChain.chain_id)}`}
                      onClick={event => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                        event.preventDefault();
                        window.history.pushState(null, '', event.currentTarget.getAttribute('href'));
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="brief-connection-link">Explore policy chain <ArrowUpRight size={15} aria-hidden="true" /></a>
                  </dd>
                </div>}
                {resurgingTopic && <div>
                  <dt><Flame size={16} strokeWidth={1.6} aria-hidden="true" />Topic resurgence</dt>
                  <dd>
                    <strong>{resurgingTopic.years_dormant} years since last tested</strong>
                    <p>Volcano index {resurgingTopic.volcano_index.toFixed(1)} · {resurgingTopic.node_id}</p>
                    <span className="brief-connection-note">Historical model signal</span>
                  </dd>
                </div>}
              </dl>
            </details>
          </header>

          <nav ref={navRef} className="brief-navigation" aria-label="Jump to brief section">
            {sections.map(section => <button key={section.id} type="button"
              aria-current={activeSection === section.id ? 'location' : undefined}
              onClick={() => jumpTo(section.id)}>{section.label}</button>)}
          </nav>

          <article className="brief-content">
            <NoteSection id="revision" title="Exam notes">
              <Note title="What happened">
                {summary?.bullets?.length ? (
                  <ul className="brief-takeaways">{summary.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>
                ) : <p className="brief-secondary">No policy highlights are available for this brief yet. Refer to the primary source below.</p>}
              </Note>
              {targets.length > 0 && <Note title="Remember in one minute">
                <dl className="brief-facts">{targets.map(target => <div key={target.label}>
                  <dt>{target.label}</dt>
                  <dd>
                    {target.value}
                    {target.label === 'Nodal agency' && nodalRisk && target.value?.trim().toLowerCase() === nodalRisk.agency.trim().toLowerCase() && <span className="brief-agency-check">
                      <strong>Review agency responsibilities</strong>
                      Based on {nodalRisk.attemptedCount} agency-role attempts (net {nodalRisk.netMarks.toFixed(2)} marks).
                      <button type="button" className="brief-fact-source" onClick={() => jumpTo('evidence')}>Check source evidence <ArrowUpRight size={14} aria-hidden="true" /></button>
                    </span>}
                  </dd>
                </div>)}</dl>
              </Note>}
              {summary?.prelims && <Note title="Prelims factual pointer"><p>{summary.prelims}</p></Note>}
              {(summary?.prelims_trap_radar || historicalTwin) && <aside className="brief-pitfall" aria-labelledby="brief-pitfall-title">
                <h4 id="brief-pitfall-title">
                  <ShieldAlert size={17} strokeWidth={1.6} aria-hidden="true" />
                  <span>Exam focus: {examFocus}</span>
                </h4>
                {summary?.prelims_trap_radar && <p>{summary.prelims_trap_radar}</p>}
                {historicalTwin && <div className="brief-historical-example">
                  <h5>Historical comparison · {historicalTwin.year}</h5>
                  <blockquote>{historicalTwin.stem}</blockquote>
                  {historicalTwin.statutory_anchor && <p className="brief-historical-anchor"><strong>Anchor:</strong> {historicalTwin.statutory_anchor}</p>}
                </div>}
              </aside>}
            </NoteSection>

            <NoteSection id="analysis" title="Mains analysis">
              {summary?.mains_analysis ? <>
                {summary.mains_analysis.context && <Note title="Context & historical timeline"><p>{summary.mains_analysis.context}</p></Note>}
                {summary.mains_analysis.core_implications && <Note title="Policy implications & federal dynamics"><p>{summary.mains_analysis.core_implications}</p></Note>}
                {summary.mains_analysis.way_forward && <Note title="Way forward & reform roadmap"><p>{summary.mains_analysis.way_forward}</p></Note>}
              </> : summary?.mains ? <Note title="Mains perspective"><p>{summary.mains}</p></Note> : (
                <Note title="Mains analysis blueprint"><p>Apply this policy development to GS Paper II (Governance, Executive & Judicial Accountability) and GS Paper III (Inclusive Growth & Macroeconomic Stability). Formulate arguments focusing on implementation bottlenecks, constitutional checks, and administrative efficacy.</p></Note>
              )}
              {summary?.mains && summary?.mains_analysis && <Note title="Analytical thesis pointer"><p className="brief-thesis">{summary.mains}</p></Note>}
            </NoteSection>

            <NoteSection id="connections" title="Connect to your syllabus">
              <p className="brief-section-context">Standard textbook & syllabus anchors · NCERT / Laxmikanth alignment</p>
              {summary?.static_linkages?.length ? summary.static_linkages.map((link, index) => (
                <Note key={index} title={link.concept}><p>{link.textbook_context}</p></Note>
              )) : <Note title="Core General Studies alignment"><p>This development maps directly to {(summary?.tags || ['General Studies']).join(', ')}. Review foundational constitutional provisions, statutory bodies, and standard economic metrics in your core notes.</p></Note>}
              {!!summary?.thematic_pillars?.length && <div className="brief-themes">
                <h4>Key thematic dimensions</h4>
                {summary.thematic_pillars.map((pillar, index) => <Note key={index} title={pillar.title}><p>{pillar.description}</p></Note>)}
              </div>}
            </NoteSection>

            <NoteSection id="evidence" title="Evidence & sources">
              <div className="brief-evidence-intro">
                <p className="brief-section-context">Span-anchored evidence ledger</p>
                {typeof summary?.grounding === 'number' && <span className="brief-verified">{summary.grounding}% facts verified</span>}
              </div>
              <ol className="brief-evidence-list">{summary?.bullets?.map((bullet, index) => {
                const claim = (summary.claims || []).find(candidate => candidate.text?.trim() === bullet?.trim()) || summary.claims?.[index];
                return <li key={index}><p>{bullet}{claim && <SourceAnchor claim={claim} />}</p></li>;
              })}</ol>
              <ContestedCard contested={summary?.contested} />
              <dl className="brief-source-record">
                <div><dt>Primary source</dt><dd>{item.source}</dd></div>
                <div><dt>Verification protocol</dt><dd className="brief-protocol">{summary?.verification_method || 'live_cite_or_drop_v1'}</dd></div>
              </dl>
              {item.url && <a className="brief-source-link" href={item.url} target="_blank" rel="noopener noreferrer">
                Read the primary source <ExternalLink size={16} aria-hidden="true" />
              </a>}
              <div className="brief-share-links" aria-label="Share this brief">
                <span>Share this brief</span>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(item.headline + ' — UPSC Policy Analysis on Tark')}`} target="_blank" rel="noopener noreferrer">Telegram <ExternalLink size={13} aria-hidden="true" /></a>
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(item.headline + '\n\n' + canonicalUrl)}`} target="_blank" rel="noopener noreferrer">WhatsApp <ExternalLink size={13} aria-hidden="true" /></a>
              </div>
            </NoteSection>
          </article>
        </div>

        <footer className="brief-footer">
          <button type="button" className={`brief-save ${saved ? 'is-saved' : ''}`} onClick={onSave} disabled={saving} aria-pressed={saved}>
            <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
            {saving ? 'Saving…' : saved ? 'Brief saved' : 'Save brief'}
          </button>
          <div className="brief-practice-actions">
            {onPractice && <button type="button" className={`brief-practice${onLaunchConveyor ? ' brief-practice--secondary' : ''}`} onClick={onPractice}>
              <Target size={17} strokeWidth={1.6} aria-hidden="true" />Practice MCQs
            </button>}
            {onLaunchConveyor && <button type="button" className="brief-practice" title="Correct answer: +2 marks. Incorrect answer: −0.66 marks." onClick={onLaunchConveyor}>
              <ShieldAlert size={17} strokeWidth={1.6} aria-hidden="true" />Try examiner drill
            </button>}
          </div>
        </footer>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
