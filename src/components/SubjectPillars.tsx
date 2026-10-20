import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Brain, ChevronDown, FileText, Layers, Search, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { CandidatePreferences } from '../types';
import { getOptionalSubject } from '../data/optional-subjects';
import {
  STUDY_SUBJECTS, STUDY_RESOURCES, STUDY_VIEW_LABEL, STUDY_KIND_LABEL,
  resourcesForSubject, searchStudyResources, resolveStudySelection, studySelectionForResource, getStudyUrl,
  type StudyResource, type StudySelection, type StudyView,
} from '../lib/study-library';
import StudyResourceContent from './study/StudyResourceContent';
import './SubjectPillars.css';

interface SubjectPillarsProps {
  candidatePreferences?: CandidatePreferences;
  onLaunchPractice?: (subjectCategory: string) => void;
  onNavigateArena?: () => void;
}

const VIEW_ICONS = { notes: BookOpen, explore: Layers, writing: FileText };
const VIEWS: StudyView[] = ['notes', 'explore', 'writing'];
const ExaminerPsycheModal = lazy(() => import('./ExaminerPsycheModal').then((module) => ({ default: module.ExaminerPsycheModal })));
function plainClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function SubjectPillars({ candidatePreferences, onLaunchPractice, onNavigateArena }: SubjectPillarsProps) {
  const preferredSubjectId = useMemo(() => {
    const focus = candidatePreferences?.focusPillars?.[0]?.toUpperCase();
    return STUDY_SUBJECTS.find((subject) => subject.paper === focus)?.id;
  }, [candidatePreferences?.focusPillars]);
  const [selection, setSelection] = useState<StudySelection>(() => resolveStudySelection(
    new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), preferredSubjectId,
  ));
  const [query, setQuery] = useState('');
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [psycheOpen, setPsycheOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();
  const subject = STUDY_SUBJECTS.find((entry) => entry.id === selection.subjectId)!;
  const items = resourcesForSubject(subject.id, selection.view);
  const resource = STUDY_RESOURCES.find((entry) => entry.id === selection.itemId)!;
  const currentIndex = items.findIndex((entry) => entry.id === resource.id);
  const searchResults = useMemo(() => searchStudyResources(query), [query]);
  const optionalSubject = candidatePreferences?.optionalSubject ? getOptionalSubject(candidatePreferences.optionalSubject) : null;

  useEffect(() => {
    const onPopState = () => {
      setSelection(resolveStudySelection(new URLSearchParams(window.location.search), preferredSubjectId));
      setQuery('');
      setResourcePickerOpen(false);
      setPsycheOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [preferredSubjectId]);

  function navigate(next: StudySelection, focusReader = false) {
    setSelection(next);
    setQuery('');
    setResourcePickerOpen(false);
    const url = getStudyUrl(next);
    if (window.location.pathname + window.location.search !== url) window.history.pushState(null, '', url);
    if (focusReader) window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({
        block: window.matchMedia('(max-width: 760px)').matches ? 'start' : 'nearest',
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    });
  }
  function selectSubject(subjectId: string) {
    navigate(resolveStudySelection(new URLSearchParams({ subject: subjectId })));
  }
  function selectView(view: StudyView) {
    navigate(resolveStudySelection(new URLSearchParams({ subject: subject.id, view })));
  }
  function openResource(event: MouseEvent<HTMLAnchorElement>, entry: StudyResource, focusReader = false) {
    if (!plainClick(event)) return;
    event.preventDefault();
    navigate(studySelectionForResource(entry), focusReader);
  }

  const practiceAvailable = Boolean(onLaunchPractice && subject.paper !== 'GS4');

  return (
    <div className="study-library">
      <header className="study-header">
        <div>
          <h1>Study library</h1>
          <p>Find a concept. Compare the details. Put your understanding to work.</p>
        </div>
        <div className="study-header-actions">
          <div className="study-search" role="search">
            <label htmlFor="study-library-search"><Search size={17} aria-hidden="true" /><span className="study-sr-only">Search the study library</span></label>
            <input
              id="study-library-search"
              type="search"
              placeholder="Search library…"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && <button type="button" aria-label="Clear library search" onClick={() => setQuery('')}><X size={16} aria-hidden="true" /></button>}
          </div>
          <button type="button" className="study-psyche-trigger" aria-haspopup="dialog" onClick={() => setPsycheOpen(true)}>
            <Brain size={17} aria-hidden="true" /> Examiner’s Psyche
          </button>
        </div>
      </header>

      {query.trim() ? (
        <section className="study-search-results" aria-labelledby="study-results-title">
          <div className="study-results-heading">
            <div>
              <h2 id="study-results-title">Search the library</h2>
              <p role="status">{searchResults.length} {searchResults.length === 1 ? 'resource' : 'resources'} matching “{query.trim()}” across all subjects</p>
            </div>
            <button className="study-text-button" type="button" onClick={() => setQuery('')}><ArrowLeft size={16} aria-hidden="true" /> Back to your subject</button>
          </div>
          {searchResults.length ? (
            <ul className="study-results-list">
              {searchResults.map((entry) => (
                <li key={entry.id}>
                  <a href={getStudyUrl(studySelectionForResource(entry))} onClick={(event) => openResource(event, entry, true)}>
                    <div>
                      <h3>{entry.title}</h3>
                      <p>{STUDY_SUBJECTS.find((item) => item.id === entry.subjectId)?.title} · {STUDY_KIND_LABEL[entry.kind]}</p>
                    </div>
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="study-empty">
              <h3>No matching resource yet</h3>
              <p>Try a broader term such as “writs”, “wetlands” or “monetary policy”. Search covers the notes and reference material currently in this library.</p>
              <button type="button" className="study-text-button" onClick={() => setQuery('')}>Clear search <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
          )}
        </section>
      ) : (
        <div className="study-layout">
          <aside className="study-subject-sidebar">
            <h2>Browse subjects</h2>
            <nav aria-label="Study subjects">
              {STUDY_SUBJECTS.map((entry) => {
                const next = resolveStudySelection(new URLSearchParams({ subject: entry.id }));
                const inFocus = candidatePreferences?.focusPillars?.some((paper) => paper.toUpperCase() === entry.paper);
                return (
                  <a
                    key={entry.id}
                    href={getStudyUrl(next)}
                    aria-current={subject.id === entry.id ? 'page' : undefined}
                    onClick={(event) => { if (plainClick(event)) { event.preventDefault(); navigate(next); } }}
                  >
                    <span>{entry.title}</span>
                    <small>{entry.paperLabel}{inFocus ? ' · Your focus' : ''}</small>
                  </a>
                );
              })}
            </nav>
          </aside>

          <div className="study-workspace">
            <div className="study-subject-select">
              <label htmlFor="study-subject">Choose a subject</label>
              <select id="study-subject" value={subject.id} onChange={(event) => selectSubject(event.target.value)}>
                {STUDY_SUBJECTS.map((entry) => <option value={entry.id} key={entry.id}>{entry.title} · {entry.paperLabel}</option>)}
              </select>
            </div>
            <header className="study-subject-header">
              <div>
                <h2>{subject.title}</h2>
                <p>{subject.description}</p>
                <span className="study-subject-meta">{subject.paperLabel} · {resourcesForSubject(subject.id).length} resources</span>
              </div>
              {(practiceAvailable || onNavigateArena) && (
                <button
                  className="study-practice-button"
                  type="button"
                  onClick={() => practiceAvailable ? onLaunchPractice?.(subject.paper) : onNavigateArena?.()}
                  title={practiceAvailable ? 'Opens the existing subject practice pool; this is not an exact-topic drill.' : 'Choose a test in the Test Arena.'}
                >
                  {practiceAvailable ? 'Subject practice' : 'Open Test Arena'} <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </header>

            <div className="study-views" role="group" aria-label="Choose a study activity">
              {VIEWS.filter((view) => resourcesForSubject(subject.id, view).length > 0).map((view) => {
                const Icon = VIEW_ICONS[view];
                return (
                  <button key={view} type="button" aria-pressed={selection.view === view} onClick={() => selectView(view)}>
                    <Icon size={16} aria-hidden="true" /> {STUDY_VIEW_LABEL[view]}
                  </button>
                );
              })}
            </div>

            <button
              className="study-resource-picker"
              type="button"
              aria-expanded={resourcePickerOpen}
              aria-controls="study-resource-index"
              onClick={() => setResourcePickerOpen((open) => !open)}
            >
              Choose a resource <span>{items.length}</span><ChevronDown size={16} aria-hidden="true" />
            </button>

            <div className="study-reader-layout">
              <nav className="study-resource-index" id="study-resource-index" data-open={resourcePickerOpen} aria-label={STUDY_VIEW_LABEL[selection.view]}>
                <p className="study-index-count">{items.length} {items.length === 1 ? 'resource' : 'resources'}</p>
                {items.map((entry) => (
                  <a
                    key={entry.id}
                    href={getStudyUrl(studySelectionForResource(entry))}
                    aria-current={entry.id === resource.id ? 'page' : undefined}
                    onClick={(event) => openResource(event, entry, true)}
                  >
                    <span>{entry.title}</span>
                    <small>{STUDY_KIND_LABEL[entry.kind]}</small>
                  </a>
                ))}
              </nav>

              <article className="study-reader" aria-labelledby="study-resource-title">
                <header className="study-reader-header">
                  <h3 id="study-resource-title" ref={headingRef} tabIndex={-1}>{resource.title}</h3>
                  <p>{STUDY_KIND_LABEL[resource.kind]}{resource.kind === 'reference' ? ` · ${resource.content.rows.length} entries` : ''}</p>
                </header>
                <motion.div
                  key={resource.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <StudyResourceContent resource={resource} />
                </motion.div>
                <details className="study-source-note">
                  <summary>About this study material</summary>
                  <p>This is an editorial study resource from Tark’s current collection. Linked original sources and review dates are not attached to this item yet. Use it alongside the official syllabus and original references.</p>
                </details>
                <nav className="study-reader-paging" aria-label="Resources in this collection">
                  <button type="button" disabled={currentIndex === 0} onClick={() => navigate(studySelectionForResource(items[currentIndex - 1]), true)}>
                    <ArrowLeft size={15} aria-hidden="true" /> Previous
                  </button>
                  <span>{currentIndex + 1} of {items.length}</span>
                  <button type="button" disabled={currentIndex === items.length - 1} onClick={() => navigate(studySelectionForResource(items[currentIndex + 1]), true)}>
                    Next <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </nav>
              </article>
            </div>
          </div>
          {optionalSubject && (
            <details className="study-optional">
              <summary>Your optional subject <ChevronDown size={14} aria-hidden="true" /></summary>
              <h3>{optionalSubject.name}</h3>
              <p>{optionalSubject.mainsStrategyTip}</p>
            </details>
          )}
        </div>
      )}
      {psycheOpen && <Suspense fallback={<p role="status" className="study-modal-loading">Opening Examiner’s Psyche…</p>}>
        <ExaminerPsycheModal
          isOpen={psycheOpen}
          onClose={() => setPsycheOpen(false)}
          onLaunchPractice={onLaunchPractice ? (paper) => { setPsycheOpen(false); onLaunchPractice(paper); } : undefined}
          onNavigateArena={onNavigateArena ? () => { setPsycheOpen(false); onNavigateArena(); } : undefined}
        />
      </Suspense>}
    </div>
  );
}
