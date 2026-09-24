import React from 'react';
import { Modal } from '../shared/Modal';
import { formatTimeLeft } from './lib/clock';

export interface HandInDialogProps {
  open: boolean;
  submitting: boolean;
  bubbled: number;
  blank: number;
  invalidQids: number[];
  circledOnly: { qid: string; n: number }[];
  flagged: { qid: string; n: number }[];
  secondsLeft: number;
  hallEndLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  onJump: (qid: string) => void;
}

export const HandInDialog: React.FC<HandInDialogProps> = ({
  open,
  submitting,
  bubbled,
  blank,
  invalidQids,
  circledOnly,
  flagged,
  secondsLeft,
  hallEndLabel,
  onClose,
  onConfirm,
  onJump,
}) => {
  return (
    <Modal isOpen={open} onClose={onClose} title="Hand in your answer sheet?" maxWidth="max-w-lg">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="border border-border/60 rounded-lg px-3 py-2.5 bg-[rgba(10,33,72,0.5)]">
          <div className="text-[11px] text-muted">Bubbled</div>
          <div className="font-mono text-xl font-semibold">{bubbled}</div>
        </div>
        <div className="border border-border/60 rounded-lg px-3 py-2.5 bg-[rgba(10,33,72,0.5)]">
          <div className="text-[11px] text-muted">Blank</div>
          <div className="font-mono text-xl font-semibold">{blank}</div>
        </div>

        {circledOnly.length > 0 && (
          <div className="border border-border/60 rounded-lg px-3 py-2.5 bg-[rgba(10,33,72,0.5)]">
            <div className="text-[11px] text-muted">Circled, not bubbled</div>
            <div className="font-mono text-xl font-semibold text-amber-400">
              {circledOnly.length}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {circledOnly.map(({ qid, n }) => (
                <button
                  key={qid}
                  type="button"
                  onClick={() => {
                    onClose();
                    onJump(qid);
                  }}
                  className="font-mono text-[11px] px-1.5 py-px rounded border border-amber-500/40 text-amber-200 cursor-pointer hover:bg-amber-500/10"
                >
                  Q{n}
                </button>
              ))}
            </div>
          </div>
        )}

        {flagged.length > 0 && (
          <div className="border border-border/60 rounded-lg px-3 py-2.5 bg-[rgba(10,33,72,0.5)]">
            <div className="text-[11px] text-muted">To revisit</div>
            <div className="font-mono text-xl font-semibold">{flagged.length}</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {flagged.map(({ qid, n }) => (
                <button
                  key={qid}
                  type="button"
                  onClick={() => {
                    onClose();
                    onJump(qid);
                  }}
                  className="font-mono text-[11px] px-1.5 py-px rounded border border-border text-secondary cursor-pointer hover:bg-surface-elevated"
                >
                  Q{n}
                </button>
              ))}
            </div>
          </div>
        )}

        {invalidQids.length > 0 && (
          <div className="border border-border/60 rounded-lg px-3 py-2.5 bg-[rgba(10,33,72,0.5)]">
            <div className="text-[11px] text-muted">Invalid rows</div>
            <div className="font-mono text-xl font-semibold text-rose-400">
              {invalidQids.length}
            </div>
          </div>
        )}
      </div>

      <p className="text-[13px] text-secondary mb-4">
        {formatTimeLeft(secondsLeft)} left on the clock. You can keep working until {hallEndLabel}.
      </p>

      <div className="flex gap-2.5 justify-end flex-wrap">
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-[#e0d0ab] text-[#050b1a] text-[13px] font-semibold cursor-pointer hover:bg-[#f4ecd8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
        >
          Keep working
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onConfirm}
          className="px-4 py-2 rounded-md border border-border text-secondary text-[13px] cursor-pointer hover:bg-surface-elevated disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
        >
          Hand in now
        </button>
      </div>
    </Modal>
  );
};
