import React from 'react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface AnswerOptionProps {
  optionKey: string;
  optionVal: string;
  isSelected: boolean;
  isQuestionLocked: boolean;
  isOptionCorrect?: boolean;
  isStruck?: boolean;
  onSelect: (key: string) => void;
  onToggleStrike?: (key: string) => void;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  optionKey,
  optionVal,
  isSelected,
  isQuestionLocked,
  isOptionCorrect,
  isStruck,
  onSelect,
  onToggleStrike,
}) => {
  let optionStyle = 'bg-surface-elevated/40 border-border text-primary hover:border-[#0194a8]/60';
  let badgeStyle = 'bg-surface-elevated border-border text-[#e0d0ab]';

  if (isQuestionLocked) {
    if (isOptionCorrect) {
      optionStyle = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300';
      badgeStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
    } else if (isSelected && !isOptionCorrect) {
      optionStyle = 'bg-rose-950/40 border-rose-500/80 text-rose-300';
      badgeStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
    } else {
      optionStyle = 'bg-surface-elevated/20 border-border text-muted opacity-40';
      badgeStyle = 'bg-surface-elevated/20 border-border text-muted';
    }
  } else if (isStruck) {
    optionStyle = 'bg-rose-950/10 border-rose-900/30 text-muted opacity-45 line-through hover:border-rose-700/50';
    badgeStyle = 'bg-rose-950/40 border-rose-900/50 text-rose-400 line-through';
  } else if (isSelected) {
    optionStyle = 'bg-[#0194a8]/15 border-[#0194a8] text-white shadow-sm ring-1 ring-[#0194a8]/30';
    badgeStyle = 'bg-[#0194a8]/30 border-[#0194a8] text-white';
  }

  return (
    <motion.button
      whileTap={isQuestionLocked ? undefined : { scale: 0.985 }}
      onClick={() => {
        if (!isQuestionLocked) onSelect(optionKey);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!isQuestionLocked) onToggleStrike?.(optionKey);
      }}
      disabled={isQuestionLocked}
      aria-label={`Option ${optionKey}: ${typeof optionVal === 'string' ? optionVal : ''}${isStruck ? ' (Eliminated)' : ''}`}
      className={`w-full p-4 rounded-sm border text-left flex items-start gap-3 transition-all cursor-pointer relative group ${optionStyle}`}
    >
      <span className={`w-6 h-6 shrink-0 rounded-sm border flex items-center justify-center font-mono text-xs font-bold transition-colors ${badgeStyle}`}>
        {optionKey}
      </span>
      <div className={`font-sans text-xs sm:text-sm leading-relaxed flex-1 pt-0.5 ${isStruck ? 'line-through text-muted/60' : ''}`}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{ p: ({ node, ...props }: any) => <span {...props} /> }}
        >
          {optionVal}
        </Markdown>
      </div>
      {!isQuestionLocked && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onToggleStrike?.(optionKey);
          }}
          title={isStruck ? 'Restore option' : 'Right-click or click to eliminate (50:50)'}
          className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border transition-opacity ${
            isStruck
              ? 'opacity-80 bg-rose-950/60 text-rose-400 border-rose-800'
              : 'opacity-0 group-hover:opacity-60 text-muted border-border hover:opacity-100 hover:text-rose-400 hover:border-rose-800'
          }`}
        >
          {isStruck ? '✕ ELIMINATED' : 'STRIKE'}
        </span>
      )}
    </motion.button>
  );
};
