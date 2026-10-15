import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, Bookmark, BookOpen, ExternalLink, Share2, Target, X, AlertTriangle, ShieldAlert, Crosshair } from 'lucide-react';
import { getDispatchOperator, HISTORICAL_TWIN_VAULT, type CurrentAffairsItem, type ParsedSyllabusTag } from './CurrentAffairs';
import { EXAMINER_OPERATORS } from '../types';
import { ContestedCard, GroundingBadge, SourceAnchor } from './TrustUI';
import { TheHinduLogo, PibLogo } from './SourceLogos';
import { getCanonicalArticleUrl } from '../lib/seo';
import { getStoredVulnerabilityIndex } from '../lib/vulnerabilityIndex';
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
  const vulnerabilityIndex = getStoredVulnerabilityIndex();
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const [activeSection, setActiveSection] = useState<SectionId>('revision');
  const canonicalUrl = getCanonicalArticleUrl(item);
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
              {item.created_at && <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
              })}</time>}
            </div>
            <h2 id="brief-title">{item.headline}</h2>
            {item.ministry && (
              <div className="brief-ministry-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '4px 0 12px' }}>
                <p className={`brief-ministry ${vulnerabilityIndex.ministrySwapBlindSpot ? 'vulnerability-warning-ministry' : ''}`} style={{ margin: 0 }}>
                  {item.ministry}
                </p>
                {vulnerabilityIndex.ministrySwapBlindSpot && (
                  <span
                    className="vulnerability-badge"
                    title="Your historical ledger indicates vulnerability to nodal ministry swaps. Verify whether this agency or department is the authentic statutory anchor."
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                    }}
                  >
                    <AlertTriangle size={12} /> Nodal Swap Trap Risk
                  </span>
                )}
              </div>
            )}

            <div className="brief-relevance" aria-label="Exam relevance">
              <span>Prelims <strong>{(summary?.prelims_relevance || 'MEDIUM').toLowerCase()}</strong></span>
              <span>Mains <strong>{(summary?.mains_relevance || 'MEDIUM').toLowerCase()}</strong></span>
              {(() => {
                const op = getDispatchOperator(item);
                const opMeta = EXAMINER_OPERATORS[op];
                return (
                  <span className="font-mono text-[11px] font-bold text-[#5fe3f5] bg-[rgba(1,148,168,0.15)] px-2 py-0.5 rounded border border-[rgba(1,148,168,0.3)] inline-flex items-center gap-1">
                    <Crosshair size={12} className="text-[#0194a8]" />
                    <span>TRAP: {opMeta?.code || op} ({opMeta?.shortLabel || 'DISTORTION'})</span>
                  </span>
                );
              })()}
              <GroundingBadge grounding={summary?.grounding} verificationMethod={summary?.verification_method}
                headline={item.headline} source={item.source} claims={summary?.claims} onClick={onInspectGrounding} />
            </div>

            {syllabusTags.length > 0 && (
              <details className="brief-syllabus">
                <summary>
                  <span className="brief-syllabus-label">Syllabus</span>
                  <span className="brief-syllabus-topics">{syllabusTags.map(tag => `${tag.paper} · ${tag.topic}`).join(' / ')}</span>
                  <span className="brief-syllabus-toggle">View mapping</span>
                </summary>
                <div className="brief-syllabus-full">
                  <h4>Verbatim UPSC syllabus mapping</h4>
                  <ul>{syllabusTags.map((tag, index) => <li key={index}>{tag.full}</li>)}</ul>
                </div>
              </details>
            )}
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
                <dl className="brief-facts">{targets.map(target => {
                  const isNodal = target.label === 'Nodal agency';
                  const isVulnerable = isNodal && vulnerabilityIndex.ministrySwapBlindSpot;
                  return (
                    <div key={target.label}>
                      <dt style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {target.label}
                        {isVulnerable && (
                          <span title="Candidate Blind Spot" style={{ display: 'inline-flex' }}>
                            <AlertTriangle size={12} color="#f59e0b" />
                          </span>
                        )}
                      </dt>
                      <dd className={isVulnerable ? 'vulnerability-warning-ministry' : ''}>
                        {target.value}
                      </dd>
                    </div>
                  );
                })}</dl>
              </Note>}
              {summary?.prelims && <Note title="Prelims factual pointer"><p>{summary.prelims}</p></Note>}
              {(() => {
                const op = getDispatchOperator(item);
                const twin = item.historical_twin || HISTORICAL_TWIN_VAULT[op];
                return (
                  <aside className="brief-pitfall" aria-labelledby="brief-pitfall-title">
                    <h4 id="brief-pitfall-title" className="flex items-center gap-2">
                      <ShieldAlert size={17} aria-hidden="true" />
                      <span>Examiner Vector: {EXAMINER_OPERATORS[op]?.label || op}</span>
                    </h4>
                    {summary?.prelims_trap_radar && <p className="mb-2">{summary.prelims_trap_radar}</p>}
                    {twin && (
                      <div className="mt-2 pt-2 border-t border-[rgba(224,208,171,0.2)] text-xs font-mono">
                        <span className="text-[#e0d0ab] font-bold">Historical UPSC Twin ({twin.year}): </span>
                        <span className="italic font-serif text-[#d6e2f0]">"{twin.stem}"</span>
                        <div className="mt-1 text-[11px] text-amber-300">
                          <strong>Anchor:</strong> {(twin as any).statutory_anchor || (twin as any).anchor}
                        </div>
                      </div>
                    )}
                  </aside>
                );
              })()}
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onPractice && <button type="button" className="brief-practice" onClick={onPractice}>
              <Target size={17} aria-hidden="true" />Practice MCQ drill
            </button>}
            {onLaunchConveyor && <button type="button" className="brief-practice" style={{ background: '#e0d0ab', color: '#050b1a' }} onClick={onLaunchConveyor}>
              <ShieldAlert size={17} aria-hidden="true" />Face Examiner Trap (+2 / −0.66)
            </button>}
          </div>
        </footer>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
