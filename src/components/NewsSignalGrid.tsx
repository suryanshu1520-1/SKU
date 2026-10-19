import { useLayoutEffect, useRef, type ReactNode } from 'react';

const ROW_HEIGHT = 4;
const CARD_GAP = 20;

/** Packs cards by their intrinsic height without changing chronological DOM order. */
export default function NewsSignalGrid({ children }: { children: ReactNode }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === 'undefined') return;
    const cards = Array.from(grid.children) as HTMLElement[];
    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const spans = cards.map(card => Math.ceil((card.getBoundingClientRect().height + CARD_GAP) / ROW_HEIGHT));
      cards.forEach((card, index) => {
        const span = `span ${spans[index]}`;
        if (card.style.gridRowEnd !== span) card.style.gridRowEnd = span;
      });
      grid.dataset.masonry = 'true';
    };

    const observer = new ResizeObserver(() => {
      if (frame === null) frame = requestAnimationFrame(measure);
    });
    cards.forEach(card => observer.observe(card));
    observer.observe(grid);
    measure();

    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      delete grid.dataset.masonry;
      cards.forEach(card => card.style.removeProperty('grid-row-end'));
    };
  }, [children]);

  return <div className="news-signal-grid" ref={gridRef}>{children}</div>;
}
