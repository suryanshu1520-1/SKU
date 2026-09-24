import React from 'react';
import { Modal } from '../shared/Modal';

export interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keyDisplay: React.ReactNode;
  action: string;
}

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ open, onClose }) => {
  const kbdCls =
    'font-mono text-[11px] border border-border border-b-2 rounded px-1.5 bg-surface-elevated text-primary inline-block';

  const rows: ShortcutRow[] = [
    {
      keyDisplay: (
        <span>
          <kbd className={kbdCls}>1</kbd>–<kbd className={kbdCls}>4</kbd> or{' '}
          <kbd className={kbdCls}>A</kbd>–<kbd className={kbdCls}>D</kbd>
        </span>
      ),
      action:
        'Choose option on the active question (circle in exam-day, bubble in practice). Same key again clears the circle.',
    },
    {
      keyDisplay: <kbd className={kbdCls}>Enter</kbd>,
      action: 'Exam-day: bubble the circled option of the active question.',
    },
    {
      keyDisplay: (
        <span>
          <kbd className={kbdCls}>Shift</kbd> + <kbd className={kbdCls}>1</kbd>–
          <kbd className={kbdCls}>4</kbd> / <kbd className={kbdCls}>A</kbd>–
          <kbd className={kbdCls}>D</kbd>
        </span>
      ),
      action: 'Strike or restore that option',
    },
    {
      keyDisplay: (
        <span>
          <kbd className={kbdCls}>S</kbd> / <kbd className={kbdCls}>F</kbd> /{' '}
          <kbd className={kbdCls}>G</kbd>
        </span>
      ),
      action: 'Confidence: Sure / 50:50 / Guess (toggle)',
    },
    {
      keyDisplay: <kbd className={kbdCls}>R</kbd>,
      action: 'Toggle revisit flag',
    },
    {
      keyDisplay: (
        <span>
          <kbd className={kbdCls}>N</kbd> or <kbd className={kbdCls}>J</kbd>
        </span>
      ),
      action: 'Next question',
    },
    {
      keyDisplay: (
        <span>
          <kbd className={kbdCls}>P</kbd> or <kbd className={kbdCls}>K</kbd>
        </span>
      ),
      action: 'Previous question',
    },
    {
      keyDisplay: <kbd className={kbdCls}>U</kbd>,
      action: 'Undo the last bubble (exam-day: within 5 s; practice: erase the active row)',
    },
    {
      keyDisplay: <kbd className={kbdCls}>O</kbd>,
      action: 'Focus the answer sheet (desktop) / open it (mobile)',
    },
    {
      keyDisplay: <kbd className={kbdCls}>?</kbd>,
      action: 'Keyboard shortcuts dialog',
    },
    {
      keyDisplay: <kbd className={kbdCls}>Esc</kbd>,
      action: 'Close the open dialog, popover or sheet. Never ends the paper.',
    },
  ];

  return (
    <Modal isOpen={open} onClose={onClose} title="Keyboard shortcuts" maxWidth="max-w-lg">
      <div className="overflow-x-auto my-2">
        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-4 font-semibold w-1/3">Key</th>
              <th className="py-2 pl-2 font-semibold w-2/3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-surface-elevated/40">
                <td className="py-2 pr-4 align-top whitespace-nowrap">{row.keyDisplay}</td>
                <td className="py-2 pl-2 align-top text-secondary leading-relaxed">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
