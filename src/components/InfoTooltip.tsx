import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <div className="relative group inline-flex items-center">
      <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700 rounded-sm px-3 py-2 shadow-xl max-w-[260px]">
          <p className="text-[10px] leading-relaxed text-zinc-300 font-sans whitespace-normal">
            {text}
          </p>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45 -mt-1" />
      </div>
    </div>
  );
}