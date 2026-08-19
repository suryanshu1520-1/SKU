import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  subtext?: string;
  accentColor?: string;
  isNumeric?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  accentColor = 'text-[#e0d0ab]',
  isNumeric = typeof value === 'number',
  prefix = '',
  suffix = '',
  decimals = 0,
  delay = 0,
  className = '',
  onClick,
}: StatCardProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={prefersReduced ? undefined : { y: -2, scale: 1.01 }}
      onClick={onClick}
      className={`bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800/80 hover:border-[#0194a8]/50 p-5 rounded-sm flex flex-col justify-between transition-colors shadow-sm backdrop-blur-sm group ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[10px] font-sans uppercase tracking-wider text-zinc-400 font-bold group-hover:text-zinc-300 transition-colors">
          {label}
        </span>
        {Icon && <Icon className={`w-4 h-4 ${accentColor} opacity-80 group-hover:opacity-100 transition-opacity`} />}
      </div>

      <div className="space-y-1">
        <div className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight ${accentColor}`}>
          {isNumeric && typeof value === 'number' ? (
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          ) : (
            <span>
              {prefix}{value}{suffix}
            </span>
          )}
        </div>

        {subtext && (
          <p className="text-[11px] font-sans text-zinc-500 leading-tight">
            {subtext}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default StatCard;
