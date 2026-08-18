import React from 'react';

interface SkeletonCardProps {
  variant?: 'stat' | 'feed' | 'quiz';
  count?: number;
  className?: string;
}

export function SkeletonCard({ variant = 'feed', count = 1, className = '' }: SkeletonCardProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 bg-zinc-900/15 border border-zinc-800/60 rounded-sm animate-pulse space-y-3.5"
        >
          {variant === 'stat' && (
            <>
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-zinc-800 rounded-sm" />
                <div className="h-4 w-4 bg-zinc-800 rounded-full" />
              </div>
              <div className="h-8 w-24 bg-zinc-800/80 rounded-sm" />
            </>
          )}

          {variant === 'feed' && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-24 bg-zinc-800 rounded-sm" />
                <div className="h-3.5 w-16 bg-zinc-800/60 rounded-sm" />
              </div>
              <div className="h-5 w-4/5 bg-zinc-800/90 rounded-sm" />
              <div className="space-y-2 pt-1">
                <div className="h-3 w-full bg-zinc-800/50 rounded-sm" />
                <div className="h-3 w-5/6 bg-zinc-800/40 rounded-sm" />
              </div>
            </>
          )}

          {variant === 'quiz' && (
            <>
              <div className="h-4 w-32 bg-zinc-800 rounded-sm" />
              <div className="h-12 w-full bg-zinc-800/80 rounded-sm" />
              <div className="space-y-2 pt-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-10 w-full bg-zinc-800/40 rounded-sm border border-zinc-800/30" />
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default SkeletonCard;
