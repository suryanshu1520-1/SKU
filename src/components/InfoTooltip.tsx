import React from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <div
      tabIndex={0}
      role="tooltip"
      aria-label={text}
      className="relative group inline-flex items-center outline-none focus-visible:ring-1 focus-visible:ring-[#0194a8] rounded-sm cursor-help"
    >
      <Info className="w-3.5 h-3.5 text-secondary group-hover:text-[#e0d0ab] group-focus-visible:text-[#e0d0ab] transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50 pointer-events-none">
        <div className="bg-surface border border-border/80 rounded-sm px-3 py-2 shadow-2xl max-w-[260px]">
          <p className="text-[10px] leading-relaxed text-primary font-sans whitespace-normal">
            {text}
          </p>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-r border-b border-border/80 rotate-45 -mt-1" />
      </div>
    </div>
  );
}