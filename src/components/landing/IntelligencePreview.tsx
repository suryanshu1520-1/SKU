import { useEffect, useId, useState, type MouseEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getArticleUrl } from '../../lib/seo';
import '../NewsSignalCard.css';
import './IntelligencePreview.css';

interface PreviewArticle {
  id: string;
  headline: string;
  url: string;
  source: string;
  createdAt: string | null;
  bullets: string[];
  tags: string[];
}

type PreviewState =
  | { status: 'loading' | 'error' | 'empty' }
  | { status: 'ready'; article: PreviewArticle };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readArticle(value: unknown): PreviewArticle | null {
  const row = record(value);
  const summary = record(row?.summary);
  if (!row || !summary) return null;
  if (typeof row.id !== 'string' || !row.id.trim()
    || typeof row.headline !== 'string' || !row.headline.trim()
    || typeof row.source !== 'string' || !row.source.trim()
    || typeof row.url !== 'string') return null;
  try {
    if (!['https:', 'http:'].includes(new URL(row.url).protocol)) return null;
  } catch {
    return null;
  }
  const bullets = Array.isArray(summary.bullets)
    ? summary.bullets.filter((text): text is string => typeof text === 'string' && Boolean(text.trim())).slice(0, 2)
    : [];
  if (bullets.length === 0) return null;
  const tags = Array.isArray(summary.tags)
    ? summary.tags.filter((text): text is string => typeof text === 'string' && Boolean(text.trim())).slice(0, 3)
    : [];
  return {
    id: row.id,
    headline: row.headline,
    url: row.url,
    source: row.source,
    createdAt: typeof row.created_at === 'string' && Number.isFinite(Date.parse(row.created_at)) ? row.created_at : null,
    bullets,
    tags,
  };
}

function openArticle(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.history.pushState(null, '', event.currentTarget.href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Read-only excerpt of a real feed row, using the feed's own reading-card styles. */
export default function IntelligencePreview({ onNavigateTracker }: { onNavigateTracker: () => void }) {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });
  const [request, setRequest] = useState(0);
  const reducedMotion = useReducedMotion();
  const headingId = useId();

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    setState({ status: 'loading' });

    async function load() {
      try {
        // Same public feed and exclusions as CurrentAffairs. No generated fallback.
        const { data, error } = await supabase
          .from('current_affairs')
          .select('id,headline,url,source,created_at,summary')
          .neq('source', 'PIB_Digest')
          .neq('source', 'PRS')
          .order('created_at', { ascending: false })
          .limit(6)
          .abortSignal(controller.signal);
        if (disposed) return;
        if (error) {
          setState({ status: 'error' });
          return;
        }
        const article = (Array.isArray(data) ? data : []).map(readArticle).find((item) => item !== null);
        setState(article ? { status: 'ready', article } : { status: 'empty' });
      } catch {
        if (!disposed) setState({ status: 'error' });
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void load();
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [request]);

  function browse(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigateTracker();
  }

  return (
    <section className="intelligence-preview" aria-labelledby={headingId}>
      <header className="intelligence-preview__header">
        <h2 id={headingId}>Inside Intelligence</h2>
        <a href="/intelligence" onClick={browse}>Browse briefs <ArrowRight size={15} aria-hidden="true" /></a>
      </header>

      {state.status === 'ready' ? (
        <motion.article
          className="news-signal intelligence-preview__article"
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="news-signal__byline">
            <a className="news-signal__source" href={state.article.url} target="_blank" rel="noopener noreferrer">
              {state.article.source}<span className="intelligence-preview__sr-only"> (original source, opens in a new tab)</span>
            </a>
            {state.article.createdAt && (
              <time className="news-signal__date" dateTime={state.article.createdAt}>
                {new Date(state.article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </time>
            )}
          </div>
          <h3 className="news-signal__headline">
            <a href={getArticleUrl(state.article)} onClick={openArticle}>{state.article.headline}</a>
          </h3>
          <ul className="news-signal__summary">
            {state.article.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}
          </ul>
          {state.article.tags.length > 0 && (
            <ul className="intelligence-preview__tags" aria-label="Article topics">
              {state.article.tags.map((tag, index) => <li key={index}>{tag}</li>)}
            </ul>
          )}
          <footer className="news-signal__footer">
            <a className="intelligence-preview__read" href={getArticleUrl(state.article)} onClick={openArticle}>
              Read brief <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a className="intelligence-preview__original" href={state.article.url} target="_blank" rel="noopener noreferrer">
              Original source <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </footer>
        </motion.article>
      ) : (
        <div className="intelligence-preview__placeholder" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' ? (
            <>
              <p role="status">Loading a brief from Intelligence…</p>
              <div className="intelligence-preview__skeleton" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
            </>
          ) : (
            <>
              <h3>The Daily Brief</h3>
              <p>{state.status === 'error' ? 'The article preview couldn’t load. You can retry or open Intelligence.' : 'No article is available to preview right now. Open Intelligence to browse the reading desk.'}</p>
              {state.status === 'error' && (
                <button type="button" onClick={() => setRequest((current) => current + 1)}>
                  <RotateCcw size={14} aria-hidden="true" /> Retry preview
                </button>
              )}
            </>
          )}
          <a className="intelligence-preview__read" href="/intelligence" onClick={browse}>
            Open Intelligence <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      )}
    </section>
  );
}
