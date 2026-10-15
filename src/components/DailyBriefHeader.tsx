import { useRef, useState } from 'react';
import { BookOpen, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import type { TrapVulnerabilityMetrics } from '../lib/vulnerabilityIndex';
import './DailyBriefHeader.css';

interface DailyBriefHeaderProps {
  count: number;
  metrics: TrapVulnerabilityMetrics;
  onInspectGrounding: () => void;
  onLaunchPractice?: () => void;
  onLaunchConveyor?: () => void;
}

export default function DailyBriefHeader({ count, metrics, onInspectGrounding, onLaunchPractice, onLaunchConveyor }: DailyBriefHeaderProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  return (
    <header className="daily-brief-header">
      <div className="daily-brief-masthead">
        <div>
          <h1>The Daily Brief <span lang="hi">दैनिक नीति संकेत</span></h1>
          <p>Every press release, cabinet decision, and policy notification that matters, distilled into a few honest minutes for UPSC and State PSC prep.</p>
        </div>
        <button type="button" className="daily-brief-tools-toggle" aria-expanded={toolsOpen} aria-controls="daily-brief-tools" onClick={() => setToolsOpen(!toolsOpen)}>
          <BookOpen size={16} aria-hidden="true" /> Study tools <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="daily-brief-provenance">
        <span><span className="daily-brief-count">{count}</span> dispatches indexed</span>
        <span className="daily-brief-wire-list">PIB · The Hindu · RBI · PRS</span>
        <button type="button" onClick={onInspectGrounding} data-tour="grounding-info">How grounding works</button>
      </div>
      {toolsOpen && <div id="daily-brief-tools" className="daily-brief-tools">
        <div className="daily-brief-tools-heading">
          <h2>Personal Trap Vulnerability Index <span>(PTVI)</span></h2>
          <span>{metrics.isColdStart ? 'Empirical UPSC benchmark' : 'Candidate autopsy active'}</span>
        </div>
        <dl className="daily-brief-metrics">
          <div><dt>50:50 expected value</dt><dd className={metrics.fiftyFiftyEV >= 0 ? 'is-positive' : 'is-negative'}>{metrics.fiftyFiftyEV >= 0 ? '+' : ''}{metrics.fiftyFiftyEV} <span>marks/call</span></dd></div>
          <div><dt>Qualifier vulnerability</dt><dd>{metrics.qualifierVulnerabilityRate}%</dd></div>
          <div><dt>Ministry blind spot</dt><dd>{metrics.ministrySwapBlindSpot ? 'Active' : 'Resolved'}</dd>{metrics.ministrySwapBlindSpot && <p>Nodal bodies highlighted in your briefs.</p>}</div>
        </dl>
        {(onLaunchPractice || onLaunchConveyor) && <div className="daily-brief-practice-options">
          {onLaunchPractice && <button type="button" onClick={onLaunchPractice}>Practice current affairs <span>Today’s arena battle</span></button>}
          {onLaunchConveyor && <button type="button" onClick={onLaunchConveyor}>8-minute trap drill <span>Adversarial conveyor belt</span></button>}
        </div>}
      </div>}
    </header>
  );
}

export type BriefTimePreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
export type BriefTrustFilter = 'ALL' | 'HIGH_GROUNDING' | 'CONTESTED';

interface DailyBriefFiltersProps {
  categories: { id: string; label: string }[];
  ministries: string[];
  ministryCounts: Record<string, number>;
  indexedCount: number;
  sources: string[];
  category: string;
  source: string;
  ministry: string;
  time: BriefTimePreset;
  trust: BriefTrustFilter;
  startDate: string;
  endDate: string;
  search: string;
  open: boolean;
  resultCount: number;
  loading: boolean;
  onCategory: (value: string) => void;
  onSource: (value: string) => void;
  onMinistry: (value: string) => void;
  onTime: (value: BriefTimePreset) => void;
  onTrust: (value: BriefTrustFilter) => void;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
  onSearch: (value: string) => void;
  onToggle: () => void;
  onReset: () => void;
}

const timeLabels: Record<BriefTimePreset, string> = { ALL: 'Any time', TODAY: 'Today', WEEK: 'Past 7 days', MONTH: 'Past 30 days', CUSTOM: 'Custom dates' };
const cleanLabel = (label: string) => label.replace(/^[^\p{L}\p{N}]+/u, '');

export function DailyBriefFilters(props: DailyBriefFiltersProps) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeFilters = () => {
    props.onToggle();
    toggleRef.current?.focus();
  };
  const { category, source, ministry, time, trust, search, open } = props;
  const specialView = category === 'TRACK' || category === 'SAVED';
  const topics = props.categories.filter(option => option.id !== 'TRACK' && option.id !== 'SAVED');
  const sourceOptions = Array.from(new Set(['PIB', 'THE HINDU', 'RBI', 'PRS', ...props.sources, ...(source !== 'ALL' ? [source] : [])]));
  const ministryOptions = Array.from(new Set([...props.ministries, ...(ministry !== 'ALL' ? [ministry] : [])])).sort();
  const activeFilters: { label: string; clear: () => void }[] = [
    ...(!specialView && category !== 'ALL' ? [{ label: cleanLabel(props.categories.find(option => option.id === category)?.label || category), clear: () => props.onCategory('ALL') }] : []),
    ...(source !== 'ALL' ? [{ label: source, clear: () => props.onSource('ALL') }] : []),
    ...(ministry !== 'ALL' ? [{ label: ministry, clear: () => props.onMinistry('ALL') }] : []),
    ...(time !== 'ALL' ? [{ label: time === 'CUSTOM' ? `${props.startDate || 'Start'} – ${props.endDate || 'End'}` : timeLabels[time], clear: () => props.onTime('ALL') }] : []),
    ...(trust !== 'ALL' ? [{ label: trust === 'HIGH_GROUNDING' ? 'Grounding ≥90%' : 'Contested claims', clear: () => props.onTrust('ALL') }] : []),
  ];
  return (
    <div className="daily-brief-discovery">
      <div className="daily-brief-browse-bar">
        <nav className="daily-brief-views" aria-label="Brief reading views">
          <button type="button" aria-pressed={!specialView} onClick={() => props.onCategory('ALL')}>Latest</button>
          {props.categories.some(option => option.id === 'TRACK') && <button type="button" aria-pressed={category === 'TRACK'} onClick={() => props.onCategory('TRACK')}>For you</button>}
          <button type="button" aria-pressed={category === 'SAVED'} onClick={() => props.onCategory('SAVED')}>Saved</button>
        </nav>
        <div className="daily-brief-search-controls">
          <div className="daily-brief-search">
            <Search size={17} aria-hidden="true" />
            <input type="search" aria-label="Search briefs" placeholder="Search briefs…" value={search} onChange={event => props.onSearch(event.target.value)} />
            {search && <button type="button" aria-label="Clear search" onClick={() => props.onSearch('')}><X size={16} aria-hidden="true" /></button>}
          </div>
          <button ref={toggleRef} type="button" className="daily-brief-filter-toggle" aria-expanded={open} aria-controls="daily-brief-filters" onClick={props.onToggle}>
            <SlidersHorizontal size={16} aria-hidden="true" />Filters{activeFilters.length > 0 && <span className="daily-brief-filter-count">{activeFilters.length}</span>}
          </button>
        </div>
      </div>

      {open && <section id="daily-brief-filters" className="daily-brief-filters" aria-label="Filter briefs" onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); closeFilters(); }
      }}>
        <div className="daily-brief-filter-heading"><h2>Refine your reading</h2><button type="button" onClick={closeFilters} aria-label="Close filters"><X size={18} aria-hidden="true" /></button></div>
        <div className="daily-brief-filter-fields">
          <label>Topic<select value={specialView ? 'ALL' : category} onChange={event => props.onCategory(event.target.value)}>
            {topics.map(option => <option key={option.id} value={option.id}>{option.id === 'ALL' ? 'All topics' : cleanLabel(option.label)}</option>)}
          </select></label>
          <label>Source<select value={source} onChange={event => props.onSource(event.target.value)}>
            <option value="ALL">All sources</option>{sourceOptions.map(value => <option key={value} value={value}>{value === 'PIB' ? 'PIB Official' : value === 'PRS' ? 'PRS Legislative Research' : value === 'RBI' ? 'RBI notifications' : value === 'THE HINDU' ? 'The Hindu' : value}</option>)}
          </select></label>
          <label>Published<select value={time} onChange={event => props.onTime(event.target.value as BriefTimePreset)}>
            {Object.entries(timeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Ministry or department<select value={ministry} onChange={event => props.onMinistry(event.target.value)}>
            <option value="ALL">All ministries ({props.indexedCount})</option>{ministryOptions.map(value => <option key={value} value={value}>{value}{props.ministryCounts[value] ? ` (${props.ministryCounts[value]})` : ''}</option>)}
          </select></label>
        </div>
        {time === 'CUSTOM' && <div className="daily-brief-date-range">
          <label>From<input type="date" value={props.startDate} max={props.endDate || undefined} onChange={event => props.onStartDate(event.target.value)} /></label>
          <label>To<input type="date" value={props.endDate} min={props.startDate || undefined} onChange={event => props.onEndDate(event.target.value)} /></label>
        </div>}
        <details className="daily-brief-evidence-filter" open={trust !== 'ALL' || undefined}>
          <summary>Evidence & grounding <ChevronDown size={15} aria-hidden="true" /></summary>
          <label>Verification<select value={trust} onChange={event => props.onTrust(event.target.value as BriefTrustFilter)}>
            <option value="ALL">All dispatches</option><option value="HIGH_GROUNDING">High grounding (≥90%)</option><option value="CONTESTED">Contested claims</option>
          </select></label>
        </details>
        <div className="daily-brief-filter-footer">
          <span role="status">{props.loading ? 'Updating briefs…' : `${props.resultCount} dispatches match`}</span>
          <button type="button" onClick={props.onReset}>Reset all</button>
          <button type="button" className="daily-brief-filter-done" onClick={closeFilters}>Done</button>
        </div>
      </section>}

      {activeFilters.length > 0 && <div className="daily-brief-applied" aria-label="Active filters">
        <span>Filtered by</span>{activeFilters.map(filter => <button type="button" key={filter.label} onClick={filter.clear} aria-label={`Remove filter: ${filter.label}`}>
          {filter.label}<X size={13} aria-hidden="true" />
        </button>)}
        <button type="button" className="daily-brief-reset" onClick={props.onReset}>Reset all</button>
      </div>}
    </div>
  );
}
