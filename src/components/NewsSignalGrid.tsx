import { useLayoutEffect, useRef, type ReactNode } from 'react';

const ROW_HEIGHT = 4;
const CARD_GAP = 20;
const MOTION_EASING = 'cubic-bezier(.16, 1, .3, 1)';
const VIEWPORT_MARGIN = 200;

interface SignalResizeDetail {
  height: number;
  duration: number;
}

/** Packs cards by their intrinsic height without changing chronological DOM order. */
export default function NewsSignalGrid({ children }: { children: ReactNode }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === 'undefined') return;

    let cards: HTMLElement[] = [];
    const heights = new Map<HTMLElement, number>();
    const targetHeights = new Map<HTMLElement, number>();
    const animations = new Map<HTMLElement, Animation>();
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionPreference.matches;
    let frame: number | null = null;
    let widthChanged = false;
    let gridWidth = grid.getBoundingClientRect().width;

    const cancelAnimations = () => {
      animations.forEach(animation => {
        animation.onfinish = null;
        animation.cancel();
      });
      animations.clear();
    };

    const nearViewport = (rect: DOMRect) => (
      rect.bottom >= -VIEWPORT_MARGIN
      && rect.top <= window.innerHeight + VIEWPORT_MARGIN
      && rect.right >= -VIEWPORT_MARGIN
      && rect.left <= window.innerWidth + VIEWPORT_MARGIN
    );

    const pack = (duration = 0) => {
      const spans = cards.map(card => `span ${Math.max(1, Math.ceil(
        ((targetHeights.get(card) ?? heights.get(card) ?? card.getBoundingClientRect().height) + CARD_GAP) / ROW_HEIGHT,
      ))}`);
      if (grid.dataset.masonry === 'true' && cards.every((card, index) => card.style.gridRowEnd === spans[index])) return;

      // Read the visible, possibly interrupted positions before cancelling transforms.
      const animate = duration > 0 && !reducedMotion && !widthChanged;
      const before = animate ? cards.map(card => card.getBoundingClientRect()) : null;
      cancelAnimations();
      cards.forEach((card, index) => { card.style.gridRowEnd = spans[index]; });
      grid.dataset.masonry = 'true';

      if (!before) return;
      // All row writes precede these reads, so each card has its final layout position.
      const after = cards.map(card => card.getBoundingClientRect());
      cards.forEach((card, index) => {
        const previous = before[index];
        const next = after[index];
        const x = previous.left - next.left;
        const y = previous.top - next.top;
        if ((Math.abs(x) < 0.5 && Math.abs(y) < 0.5)
          || (!nearViewport(previous) && !nearViewport(next))
          || typeof card.animate !== 'function') return;

        const animation = card.animate([
          { transform: `translate(${x}px, ${y}px)` },
          { transform: 'translate(0, 0)' },
        ], { duration, easing: MOTION_EASING, fill: 'both' });
        animations.set(card, animation);
        animation.onfinish = () => {
          if (animations.get(card) !== animation) return;
          animations.delete(card);
          animation.cancel();
        };
      });
    };

    const schedulePack = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (widthChanged) {
          cancelAnimations();
          cards.forEach(card => heights.set(card, card.getBoundingClientRect().height));
        }
        pack();
        widthChanged = false;
      });
    };

    const observer = new ResizeObserver(entries => {
      let dirty = false;
      entries.forEach(entry => {
        if (entry.target === grid) {
          if (Math.abs(entry.contentRect.width - gridWidth) > 0.5) {
            gridWidth = entry.contentRect.width;
            widthChanged = true;
            dirty = true;
          }
          return;
        }
        const card = entry.target as HTMLElement;
        const height = entry.borderBoxSize?.[0]?.blockSize ?? card.getBoundingClientRect().height;
        const previous = heights.get(card);
        heights.set(card, height);
        // The target span reserves space for the complete disclosure transition.
        if (!targetHeights.has(card) && (previous === undefined || Math.abs(previous - height) > 0.5)) dirty = true;
      });
      if (dirty) schedulePack();
    });

    const reconcileCards = () => {
      // Filtering/pagination can move otherwise unchanged cards outside a resize transaction.
      cancelAnimations();
      const nextCards = Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
      cards.forEach(card => {
        if (nextCards.includes(card)) return;
        observer.unobserve(card);
        animations.get(card)?.cancel();
        animations.delete(card);
        heights.delete(card);
        targetHeights.delete(card);
        card.style.removeProperty('grid-row-end');
      });
      nextCards.forEach(card => {
        if (heights.has(card)) return;
        heights.set(card, card.getBoundingClientRect().height);
        observer.observe(card, { box: 'border-box' });
      });
      cards = nextCards;
      pack();
    };

    const eventCard = (event: Event) => {
      const card = event.target;
      return card instanceof HTMLElement && card.parentElement === grid && heights.has(card) ? card : null;
    };

    const onResize = (event: Event) => {
      const card = eventCard(event);
      const detail = (event as CustomEvent<SignalResizeDetail>).detail;
      if (!card || !detail || !Number.isFinite(detail.height) || detail.height <= 0) return;
      targetHeights.set(card, detail.height);
      pack(Number.isFinite(detail.duration) ? Math.max(0, Math.min(detail.duration, 1000)) : 320);
    };

    const onResizeEnd = (event: Event) => {
      const card = eventCard(event);
      if (!card) return;
      targetHeights.delete(card);
      heights.set(card, card.getBoundingClientRect().height);
      pack();
    };

    const onMotionPreferenceChange = () => {
      reducedMotion = motionPreference.matches;
      if (reducedMotion) cancelAnimations();
    };

    const mutations = new MutationObserver(reconcileCards);
    mutations.observe(grid, { childList: true });
    observer.observe(grid);
    grid.addEventListener('news-signal-resize', onResize);
    grid.addEventListener('news-signal-resize-end', onResizeEnd);
    motionPreference.addEventListener('change', onMotionPreferenceChange);
    reconcileCards();

    return () => {
      mutations.disconnect();
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      cancelAnimations();
      grid.removeEventListener('news-signal-resize', onResize);
      grid.removeEventListener('news-signal-resize-end', onResizeEnd);
      motionPreference.removeEventListener('change', onMotionPreferenceChange);
      delete grid.dataset.masonry;
      cards.forEach(card => card.style.removeProperty('grid-row-end'));
    };
  }, []);

  return <div className="news-signal-grid" ref={gridRef}>{children}</div>;
}
