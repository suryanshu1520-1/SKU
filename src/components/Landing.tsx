import type { MouseEvent } from 'react';
import { ArrowDown, ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import IntelligencePreview from './landing/IntelligencePreview';
import LandingTrial from './landing/LandingTrial';
import type { CandidatePreferences } from '../types';
import './Landing.css';

interface LandingProps {
  onNavigateArena: () => void;
  onNavigateTracker: () => void;
  onNavigateProfile: () => void;
  onNavigateLibrary?: () => void;
  onNavigateHumanities?: () => void;
  onNavigateObservatory?: () => void;
  onNavigateLeaderboard?: () => void;
  onNavigateManifesto?: () => void;
  onNavigateLegal?: (type: 'privacy' | 'terms' | 'refund') => void;
  onLaunchConveyor?: () => void;
  candidatePreferences?: CandidatePreferences;
}

// Keep real hrefs for new tabs, link previews and native browser navigation.
function navigateLocally(event: MouseEvent<HTMLAnchorElement>, navigate?: () => void) {
  if (!navigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate();
}

export default function Landing({
  onNavigateArena,
  onNavigateTracker,
  onNavigateProfile,
  onNavigateLibrary,
  onNavigateManifesto,
  onNavigateLegal,
  onLaunchConveyor,
}: LandingProps) {
  return (
    <div className="landing-v3">
      <section className="landing-hero landing-shell" aria-labelledby="landing-promise">
        <div className="landing-hero-copy">
          <h1 id="landing-promise">
            <span>Less noise.</span>
            <span>More <em>insight.</em></span>
          </h1>
          <p className="landing-intro">
            Current affairs for a deeper kind of preparation.
            Understand the story, find its place in the syllabus,
            and carry it into practice.
          </p>
          <div className="landing-hero-actions">
            <a className="landing-primary" href="/intelligence" onClick={(event) => navigateLocally(event, onNavigateTracker)}>
              Explore Intelligence <ArrowRight size={19} aria-hidden="true" />
            </a>
            <a className="landing-quiet-link" href="#landing-practice">
              Try a question <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
          <p className="landing-hero-note">Made for UPSC. Built around understanding.</p>
        </div>
        <div className="landing-hero-preview"><IntelligencePreview onNavigateTracker={onNavigateTracker} /></div>
        <div className="landing-hero-caption">
          <span>A headline is a starting point.</span>
          <span>The connections are where the learning begins.</span>
        </div>
      </section>

      <section className="landing-reading landing-shell" aria-labelledby="landing-reading-title">
        <div className="landing-reading-heading">
          <h2 id="landing-reading-title">A clearer way<br />to stay current.</h2>
          <a className="landing-text-link" href="/intelligence" onClick={(event) => navigateLocally(event, onNavigateTracker)}>
            Open the reading desk <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="landing-reading-notes">
          <div>
            <h3>The story, in focus.</h3>
            <p>Concise briefs put the key developments first. Follow the source when you want the full picture.</p>
          </div>
          <div>
            <h3>A place in the syllabus.</h3>
            <p>Move between the news and its wider themes, from governance and the economy to science and the environment.</p>
          </div>
          <div>
            <h3>Something to return to.</h3>
            <p>Save a useful article. Revisit the ideas that matter to your preparation, at your own pace.</p>
          </div>
        </div>
      </section>

      <section className="landing-practice" id="landing-practice" aria-labelledby="landing-practice-title">
        <div className="landing-shell landing-practice-layout">
          <div className="landing-practice-copy">
            <BookOpen className="landing-practice-icon" size={29} strokeWidth={1.3} aria-hidden="true" />
            <h2 id="landing-practice-title">Reading is a start.<br /><em>Make it stick.</em></h2>
            <p>Put an idea to the test. Work through a question, examine your reasoning, and see what needs another look.</p>
            <p className="landing-practice-invitation">Start with one from the UPSC archive.</p>
            <div className="landing-practice-links">
              <a className="landing-text-link" href="/arena" onClick={(event) => navigateLocally(event, onNavigateArena)}>
                Enter the Test Arena <ArrowRight size={17} aria-hidden="true" />
              </a>
              {onNavigateLibrary && (
                <a className="landing-quiet-link" href="/library" onClick={(event) => navigateLocally(event, onNavigateLibrary)}>
                  Browse past papers
                </a>
              )}
              {onLaunchConveyor && (
                <button className="landing-quiet-link" type="button" onClick={onLaunchConveyor}>
                  Try the 8-minute challenge <ChevronRight size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <LandingTrial onNavigateArena={onNavigateArena} />
        </div>
      </section>

      <section className="landing-membership landing-shell" aria-labelledby="landing-membership-title">
        <div>
          <h2 id="landing-membership-title">Your preparation.<br />A little more deliberate.</h2>
          <p>Find your next read in Intelligence. Make room for practice when you're ready.</p>
          <a className="landing-primary" href="/intelligence" onClick={(event) => navigateLocally(event, onNavigateTracker)}>
            Find your next read <ArrowRight size={19} aria-hidden="true" />
          </a>
        </div>
        <aside className="landing-membership-note" aria-label="Tark membership">
          <span className="landing-membership-price">₹399<span> / paid once</span></span>
          <p>Make Tark part of your routine with lifetime membership.</p>
          <button className="landing-text-link" type="button" onClick={onNavigateProfile}>
            Explore membership <ArrowRight size={17} aria-hidden="true" />
          </button>
          <a className="landing-quiet-link" href="/refund" onClick={(event) => navigateLocally(event, onNavigateLegal ? () => onNavigateLegal('refund') : undefined)}>
            Read the refund terms
          </a>
        </aside>
      </section>

      <footer className="landing-footer landing-shell">
        <a className="landing-footer-brand" href="/" aria-label="Tark home">
          <img src="/logos/tark-wordmark-gold.svg" alt="Tark" width="82" height="28" loading="lazy" />
        </a>
        <p>A little more clarity. Every day.</p>
        <nav aria-label="Landing footer">
          <a href="/manifesto" onClick={(event) => navigateLocally(event, onNavigateManifesto)}>Our approach</a>
          {(['privacy', 'terms', 'refund'] as const).map((type) => (
            <a key={type} href={`/${type}`} onClick={(event) => navigateLocally(event, onNavigateLegal ? () => onNavigateLegal(type) : undefined)}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  );
}
