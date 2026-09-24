import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Announcement } from './useExamSession';
import { playBell } from './lib/bell';

export interface HallAnnouncementsProps {
  announcement: Announcement | null;
  bell: boolean;
  onDismiss: () => void;
}

export const HallAnnouncements: React.FC<HallAnnouncementsProps> = ({
  announcement,
  bell,
  onDismiss,
}) => {
  const reducedMotion = useReducedMotion();
  const lastPlayedIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (announcement && announcement.id !== lastPlayedIdRef.current) {
      lastPlayedIdRef.current = announcement.id;
      if (bell) {
        playBell();
      }
    }
  }, [announcement, bell]);

  const politeText = announcement && !announcement.urgent ? announcement.text : '';
  const assertiveText = announcement && announcement.urgent ? announcement.text : '';
  const isAmber =
    announcement && (announcement.urgent || announcement.text.startsWith('10 minutes'));

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {politeText}
      </div>
      <div className="sr-only" aria-live="assertive">
        {assertiveText}
      </div>

      <AnimatePresence>
        {announcement && (
          <motion.div
            key={announcement.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={`mt-3 flex items-center gap-3 rounded-md px-3.5 py-2.5 text-[13.5px] ${
              isAmber
                ? 'border border-amber-500/35 bg-amber-500/10 text-amber-200'
                : 'border border-border bg-surface-elevated text-primary'
            }`}
          >
            <span className="flex-1">{announcement.text}</span>
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e0d0ab] rounded shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
