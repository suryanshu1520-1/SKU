import React, { useId } from 'react';
import { ArrowUpRight, Bookmark, Check, ChevronDown, Share2 } from 'lucide-react';
import type { CurrentAffairsItem } from './CurrentAffairs';
import { ContestedCard, GroundingBadge, SourceAnchor } from './TrustUI';
import './NewsSignalCard.css';

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
  const contextId = `news-context-${instanceId}`;
  const headlineId = `news-headline-${instanceId}`;
  const Heading = lead ? 'h2' : 'h3';
  const date = item.created_at ? new Date(item.created_at) : null;
  const validDate = date && Number.isFinite(date.getTime()) ? date : null;
  const bullets = item.summary?.bullets?.slice(0, lead ? 2 : 1) || [];

  return (
    <article
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

      <div className="news-signal__context" id={contextId} hidden={!contextOpen}>
        <div className="news-signal__provenance">
          {item.ministry && <p className="news-signal__ministry">{item.ministry}</p>}
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
    </article>
  );
}
