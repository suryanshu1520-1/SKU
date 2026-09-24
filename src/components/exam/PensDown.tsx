import React, { useEffect, useRef } from 'react';

export interface PensDownProps {
  hallEndLabel: string;
}

export const PensDown: React.FC<PensDownProps> = ({ hallEndLabel }) => {
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pens-down-title"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(2,8,20,0.82)] p-4"
    >
      <div className="bg-surface border border-border rounded-xl px-8 py-7 text-center max-w-sm w-full">
        <h2
          id="pens-down-title"
          ref={titleRef}
          tabIndex={-1}
          className="font-serif text-2xl text-primary focus:outline-none"
        >
          Time. Pens down.
        </h2>
        <p className="mt-2 text-sm text-secondary">
          {hallEndLabel} on the hall clock. Your answer sheet is being collected.
        </p>
      </div>
    </div>
  );
};
