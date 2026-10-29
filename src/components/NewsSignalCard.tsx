import React, { useId, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowUpRight, Bookmark, Check, ChevronDown, Share2 } from 'lucide-react';
import type { CurrentAffairsItem } from './CurrentAffairs';
import { ContestedCard, GroundingBadge, SourceAnchor } from './TrustUI';
import './NewsSignalCard.css';

const DISCLOSURE_DURATION = { open: 320, close: 260 };

export interface NewsSignalCardProps {
  item: CurrentAffairsItem;
  articleId: string;
  lead?: boolean;
  saved: boolean;
  saving: boolean;
  contextOpen: boolean;
  onToggleContext: () => void;
  onOpen: () => void;
  onSave: () => void;
  onShare: (event: React.MouseEvent) => void;
  onGrounding: () => void;
  examContext: React.ReactNode;
}

/** A reading-first dispatch. Examination detail is available when the reader needs it. */
export default function NewsSignalCard({
  item,
  articleId,
  lead = false,
  saved,
  saving,
  contextOpen,
  onToggleContext,
  onOpen,
  onSave,
  onShare,
  onGrounding,
  examContext,
}: NewsSignalCardProps) {
  const instanceId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(false);
  const animationsRef = useRef<{ height: Animation; opacity: Animation } | null>(null);
  const reducedMotion = useReducedMotion();
  const contextId = `news-context-${instanceId}`;
  const headlineId = `news-headline-${instanceId}`;
  const Heading = lead ? 'h2' : 'h3';
  const date = item.created_at ? new Date(item.created_at) : null;
  const validDate = date && Number.isFinite(date.getTime()) ? date : null;
  const bullets = item.summary?.bullets?.slice(0, lead ? 2 : 1) || [];

  useLayoutEffect(() => {
    const card = cardRef.current;
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!card || !frame || !content) return;
    let targetHeight = 0;

    const settle = () => {
      frame.style.height = contextOpen ? 'auto' : '0px';
      frame.hidden = !contextOpen;
      content.style.opacity = '1';
      card.dispatchEvent(new CustomEvent('news-signal-resize-end', { bubbles: true }));
    };

    const resize = () => {
      const fromHeight = frame.hidden ? 0 : frame.getBoundingClientRect().height;
      const fromOpacity = Number.parseFloat(getComputedStyle(content).opacity);
      frame.hidden = false;
      targetHeight = contextOpen ? content.getBoundingClientRect().height : 0;
      const baseHeight = card.getBoundingClientRect().height - fromHeight;
      const previous = animationsRef.current;
      const shouldAnimate = mountedRef.current && !reducedMotion
        && typeof frame.animate === 'function' && Math.abs(fromHeight - targetHeight) > 0.5;
      const duration = contextOpen ? DISCLOSURE_DURATION.open : DISCLOSURE_DURATION.close;

      if (!contextOpen && frame.contains(document.activeElement)) toggleRef.current?.focus({ preventScroll: true });

      // Reserve the final masonry space once. Neighbours can then move on the compositor
      // while only this disclosure's clipped height changes during the reveal.
      frame.style.height = `${fromHeight}px`;
      if (shouldAnimate) {
        card.dispatchEvent(new CustomEvent('news-signal-resize', {
          bubbles: true,
          detail: { height: baseHeight + targetHeight, duration },
        }));
      }
      if (previous) {
        previous.height.onfinish = null;
        previous.height.cancel();
        previous.opacity.cancel();
        animationsRef.current = null;
      }
      if (!shouldAnimate) {
        settle();
        return;
      }

      const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
      frame.style.height = `${targetHeight}px`;
      const height = frame.animate([
        { height: `${fromHeight}px` }, { height: `${targetHeight}px` },
      ], { duration, easing });
      const opacity = content.animate([
        { opacity: fromHeight < 1 ? 0 : fromOpacity }, { opacity: contextOpen ? 1 : 0 },
      ], { duration: contextOpen ? 200 : 160, easing, fill: 'forwards' });
      animationsRef.current = { height, opacity };
      height.onfinish = () => {
        if (animationsRef.current?.height !== height) return;
        animationsRef.current = null;
        opacity.cancel();
        settle();
      };
    };

    resize();
    mountedRef.current = true;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (contextOpen && Math.abs(content.getBoundingClientRect().height - targetHeight) > 0.5) resize();
    });
    observer?.observe(content);
    return () => observer?.disconnect();
  }, [contextOpen, reducedMotion]);

  useLayoutEffect(() => () => {
    const current = animationsRef.current;
    if (current) {
      current.height.onfinish = null;
      current.height.cancel();
      current.opacity.cancel();
    }
  }, []);

  return (
    <article
      ref={cardRef}
      className={`news-signal${lead ? ' news-signal--lead' : ''}`}
      aria-labelledby={headlineId}
      data-article-id={articleId}
    >
      <div className="news-signal__byline-row">
        <div className="news-signal__byline">
          <a
            className="news-signal__source"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.source || 'Original source'} (opens in a new tab)`}
          >
            {item.source || 'Original source'}
          </a>
          {item.coverage_scope && item.coverage_scope !== 'domestic' && (
            <span className="px-1.5 py-0.5 bg-amber-950/40 border border-amber-600/40 text-amber-300 text-[10px] font-mono rounded uppercase tracking-wider">
              {item.coverage_scope === 'international' ? 'International' : 'Cross-Border'}
            </span>
          )}
          {validDate && (
            <time className="news-signal__date" dateTime={validDate.toISOString()}>
              {validDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </time>
          )}
        </div>
        <button
          type="button"
          className={`news-signal__save${saved ? ' news-signal__save--saved' : ''}`}
          aria-label={saving ? 'Saving article' : saved ? 'Remove saved article' : 'Save article'}
          aria-pressed={saved}
          aria-busy={saving}
          title={saved ? 'Remove saved article' : 'Save article'}
          disabled={saving}
          onClick={onSave}
        >
          <Bookmark size={18} strokeWidth={1.6} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>

      <Heading className="news-signal__headline" id={headlineId}>
        <button className="news-signal__headline-link" type="button" onClick={onOpen}>
          {item.headline}
        </button>
      </Heading>

      {bullets.length > 0 && (
        <ul className="news-signal__summary">
          {bullets.map((bullet, index) => {
            const claim = (item.summary?.claims || []).find((candidate) => candidate.text?.trim() === bullet?.trim())
              || item.summary?.claims?.[index];
            return (
              <li key={index}>
                <span>{bullet}</span>
                {claim && <SourceAnchor claim={claim} />}
              </li>
            );
          })}
        </ul>
      )}

      <ContestedCard contested={item.summary?.contested} />

      <div className="news-signal__footer">
        <button className="news-signal__read" type="button" onClick={onOpen}>
          Read brief
          <ArrowUpRight size={17} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <button
          ref={toggleRef}
          className="news-signal__context-toggle"
          type="button"
          aria-expanded={contextOpen}
          aria-controls={contextId}
          onClick={onToggleContext}
        >
          Exam context
          <ChevronDown size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>

      <div ref={frameRef} className="news-signal__disclosure" id={contextId} aria-hidden={!contextOpen} inert={!contextOpen}>
        <div ref={contentRef} className="news-signal__context">
          <div className="news-signal__provenance">
            {item.ministry && <p className="news-signal__ministry">{item.ministry}</p>}
            {item.summary?.india_posture && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-200 bg-amber-950/50 border border-amber-700/50 px-2 py-0.5 rounded">
                Posture: {item.summary.india_posture.replace(/_/g, ' ')}
              </span>
            )}
            <div className="news-signal__grounding">
              <GroundingBadge
                grounding={item.summary?.grounding}
                verificationMethod={item.summary?.verification_method}
                headline={item.headline}
                source={item.source}
                sourceUrl={item.url}
                claims={item.summary?.claims}
                onClick={onGrounding}
              />
            </div>
          </div>
          <div className="news-signal__exam-content">{examContext}</div>
          <div className="news-signal__context-actions">
            {saved && (
              <span className="news-signal__saved-note">
                <Check size={14} aria-hidden="true" /> Saved for revision
              </span>
            )}
            <button className="news-signal__share" type="button" onClick={onShare}>
              <Share2 size={15} strokeWidth={1.6} aria-hidden="true" />
              Share article
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
