import React from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  className?: string;
}

export function InlineMath({ math, className = '' }: MathViewProps) {
  try {
    const html = katex.renderToString(math, {
      displayMode: false,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
    return (
      <span
        className={`inline-katex font-serif text-[#e0d0ab] ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (e) {
    return <span className={`font-mono text-xs text-[#e0d0ab] ${className}`}>{math}</span>;
  }
}

export function BlockMath({ math, className = '' }: MathViewProps) {
  try {
    const html = katex.renderToString(math, {
      displayMode: true,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
    return (
      <div
        className={`block-katex my-3 overflow-x-auto py-2 px-3 rounded bg-zinc-950/60 border border-zinc-800/80 text-center text-[#e0d0ab] select-all scrollbar-thin ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (e) {
    return (
      <pre className={`font-mono text-xs bg-zinc-950/80 p-3 rounded text-zinc-300 overflow-x-auto ${className}`}>
        {math}
      </pre>
    );
  }
}
