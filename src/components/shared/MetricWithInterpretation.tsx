import React, { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { LucideIcon, ChevronDown } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

export interface MetricWithInterpretationProps {
  label: string;
  value: number | string;
  interpretation: string;
  icon?: LucideIcon;
  subtext?: string;
  accentColor?: string;
  isNumeric?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
  className?: string;
  details?: React.ReactNode;
}

export function MetricWithInterpretation({
  label,
  value,
  interpretation,
  icon: Icon,
  subtext,
  accentColor = 'text-primary',
  isNumeric = typeof value === 'number',
  prefix = '',
  suffix = '',
  decimals = 0,
  delay = 0,
  className = '',
  details,
}: MetricWithInterpretationProps) {
  // Runtime invariant: interpretation must be non-empty in development
  if (import.meta.env.DEV && (!interpretation || !interpretation.trim())) {
    throw new Error(
      `[Invariant Violation] MetricWithInterpretation for "${label}" requires a non-empty interpretation string.`
    );
  }

  const [isExpanded, setIsExpanded] = useState(false);
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`p-4 bg-surface/80 border border-border/80 rounded-sm flex flex-col justify-between text-left transition-all ${className}`}
    >
      <div>
        {/* Metric Label & Optional Icon */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-wider font-bold">
            {Icon && <Icon className={`w-3.5 h-3.5 ${accentColor}`} />}
            <span className={accentColor}>{label}</span>
          </div>
          {subtext && (
            <span className="text-[10px] font-sans text-muted">
              {subtext}
            </span>
          )}
        </div>

        {/* Metric Numeric Value */}
        <div className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${accentColor}`}>
          {isNumeric && typeof value === 'number' ? (
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          ) : (
            <span>
              {prefix}{value}{suffix}
            </span>
          )}
        </div>

        {/* Interpretation Layer (Headline Insight) */}
        <p className="text-[11px] font-sans text-secondary leading-relaxed mt-2 pt-2 border-t border-border/50">
          {interpretation}
        </p>
      </div>

      {/* Progressive Disclosure (Details) */}
      {details && (
        <div className="mt-2 pt-1 border-t border-border/30">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-[10px] font-sans uppercase tracking-wider text-muted hover:text-primary transition-colors cursor-pointer py-1"
          >
            <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                isExpanded ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pt-2 text-[11px] font-sans text-muted leading-relaxed"
              >
                {details}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default MetricWithInterpretation;
