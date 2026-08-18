import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  className = '',
}: EmptyStateProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center p-12 sm:p-16 border border-dashed border-zinc-800 rounded-sm bg-zinc-900/10 text-center ${className}`}
    >
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full mb-3.5">
        <Icon className="w-6 h-6 text-zinc-500" />
      </div>
      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-200 mb-1.5">
        {title}
      </h4>
      {description && (
        <p className="text-zinc-500 text-xs max-w-sm mx-auto leading-relaxed mb-4">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#0194a8] text-[#e0d0ab] text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-sm"
        >
          {actionText}
        </button>
      )}
    </motion.div>
  );
}

export default EmptyState;
