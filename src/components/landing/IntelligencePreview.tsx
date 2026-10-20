import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import './IntelligencePreview.css';

const SOURCE_URL = 'https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=160498&id=160498&lang=1&reg=3';

const VIEWS = [
  {
    id: 'idea',
    label: 'The idea',
    heading: 'Store electricity as height.',
    copy: 'Surplus electricity moves water uphill. When power is needed, water returns through turbines to generate it.',
  },
  {
    id: 'distinction',
    label: 'The distinction',
    heading: 'What makes a closed loop?',
    copy: 'In an off-stream closed-loop project, neither reservoir sits on a river or a perennial watercourse.',
  },
  {
    id: 'connection',
    label: 'The connection',
    heading: 'A current event. A lasting concept.',
    copy: 'Connect this brief to energy infrastructure: how electricity can be stored and made available when needed.',
  },
] as const;

type PreviewView = (typeof VIEWS)[number]['id'];

function ReservoirDiagram({ view }: { view: PreviewView }) {
  if (view === 'connection') {
    return (
      <svg className="intelligence-preview__diagram" viewBox="0 0 504 252" aria-hidden="true">
        <path className="intelligence-preview__guide" d="M252 32v190M42 126h420" />
        <path className="intelligence-preview__connection-line" d="M128 126h248" />
        <path className="intelligence-preview__connection-flow" d="M128 126h248" />
        <circle cx="128" cy="126" r="48" className="intelligence-preview__node-fill" />
        <circle cx="376" cy="126" r="48" className="intelligence-preview__node-fill intelligence-preview__node-fill--gold" />
        <path d="M108 126h40m-31-9 11 9-11 9m19-34v50" className="intelligence-preview__diagram-icon" />
        <path d="M357 109h17l7 7v29h-24zm17 0v9h7m-17 8h10m-10 8h10" className="intelligence-preview__diagram-icon intelligence-preview__diagram-icon--gold" />
        <text x="128" y="202" textAnchor="middle" className="intelligence-preview__svg-label">Pumped storage</text>
        <text x="376" y="202" textAnchor="middle" className="intelligence-preview__svg-label">GS III · Energy</text>
        <text x="252" y="93" textAnchor="middle" className="intelligence-preview__svg-note">Study connection</text>
        <circle cx="252" cy="126" r="5" fill="#e0d0ab" />
      </svg>
    );
  }

  return (
    <svg className="intelligence-preview__diagram" viewBox="0 0 504 252" aria-hidden="true">
      <path className="intelligence-preview__guide" d="M26 239h452M26 112h452" />
      {view === 'distinction' && (
        <>
          <path d="M51 28c25 18-19 30 0 49s-18 28 0 46-20 31 0 47" className="intelligence-preview__river" />
          <text x="27" y="19" className="intelligence-preview__svg-note">River</text>
          <path d="M91 48v90" className="intelligence-preview__separation" />
        </>
      )}
      <path d="M192 177V78q0-10 10-10h83" className="intelligence-preview__pipe" />
      <path d="M330 99v102q0 10-10 10h-91" className="intelligence-preview__pipe" />
      <path d="M192 177V78q0-10 10-10h83" className="intelligence-preview__water-flow intelligence-preview__water-flow--up" />
      <path d="M330 99v102q0 10-10 10h-91" className="intelligence-preview__water-flow" />

      <path d="M283 42v47q0 12 12 12h150q12 0 12-12V42" className="intelligence-preview__reservoir-outline" />
      <path d="M285 65h170v24q0 10-10 10H295q-10 0-10-10z" className="intelligence-preview__water" />
      <path d="M285 65h170" className="intelligence-preview__water-surface" />
      <path d="M75 178v47q0 12 12 12h130q12 0 12-12v-47" className="intelligence-preview__reservoir-outline" />
      <path d="M77 201h150v24q0 10-10 10H87q-10 0-10-10z" className="intelligence-preview__water" />
      <path d="M77 201h150" className="intelligence-preview__water-surface" />

      <circle cx="192" cy="132" r="14" className="intelligence-preview__machine" />
      <path d="m187 132 5-6 5 6m-5-5v12" className="intelligence-preview__machine-mark intelligence-preview__machine-mark--gold" />
      <circle cx="330" cy="161" r="14" className="intelligence-preview__machine" />
      <g className="intelligence-preview__turbine">
        <path d="m330 151 2 7 7-2-5 6 4 6-7-3-5 5 1-8-7-3 8-1z" className="intelligence-preview__turbine-mark" />
      </g>

      <text x="283" y="26" className="intelligence-preview__svg-label">Upper reservoir</text>
      <text x="75" y="161" className="intelligence-preview__svg-label">Lower reservoir</text>
      <text x="166" y="121" textAnchor="end" className="intelligence-preview__svg-note intelligence-preview__svg-note--gold">Pump up</text>
      <text x="354" y="151" className="intelligence-preview__svg-note">Generate</text>
    </svg>
  );
}

/** A source-linked, illustrative brief. It deliberately does not simulate a live feed. */
export default function IntelligencePreview() {
  const [selected, setSelected] = useState<PreviewView>('idea');
  const [paused, setPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const containerRef = useRef<HTMLElement>(null);
  const inView = useInView(containerRef, { amount: 0.15 });
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const headingId = useId();
  const active = VIEWS.find((view) => view.id === selected)!;
  const moving = inView && pageVisible && !reducedMotion && !paused;

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return (
    <section
      ref={containerRef}
      className="intelligence-preview"
      aria-labelledby={headingId}
      data-moving={moving ? 'true' : 'false'}
    >
      <header className="intelligence-preview__header">
        <div>
          <h2 id={headingId}>Pumped storage,<br /><em>explained.</em></h2>
        </div>
        <button
          type="button"
          className="intelligence-preview__motion-control"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? 'Play diagram animation' : 'Pause diagram animation'}
          aria-pressed={paused}
          disabled={Boolean(reducedMotion)}
          title={reducedMotion ? 'Animation is off to respect your reduced motion setting' : undefined}
        >
          {paused || reducedMotion ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
          <span>{reducedMotion ? 'Motion off' : paused ? 'Play' : 'Pause'}</span>
        </button>
      </header>

      <div className="intelligence-preview__controls" aria-label="Explore this brief">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            aria-pressed={selected === view.id}
            aria-controls={panelId}
            onClick={() => setSelected(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div id={panelId} className="intelligence-preview__panel" role="region" aria-label={active.label}>
        <div className="intelligence-preview__drawing">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected}
              initial={reducedMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <ReservoirDiagram view={selected} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="intelligence-preview__explanation" aria-live="polite" aria-atomic="true">
          <h3>{active.heading}</h3>
          <p>{active.copy}</p>
        </div>
      </div>

      <footer className="intelligence-preview__footer">
        <span>Illustrative brief</span>
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" aria-label="Read the PIB source on pumped storage hydropower (opens in a new tab)">
          PIB · 19 Oct 2026 <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
    </section>
  );
}
