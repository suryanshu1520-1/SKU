import React from 'react';
import type { ExamResult } from '../types';
import { disciplineLines } from './interpret';

export interface SheetDisciplineProps {
  result: ExamResult;
}

export const SheetDiscipline: React.FC<SheetDisciplineProps> = ({ result }) => {
  if (result.rules !== 'exam_day') return null;

  const lines = disciplineLines(result);

  return (
    <div className="border-t border-border pt-[18px] grid gap-2.5">
      <h2 className="text-[15px] font-semibold text-primary m-0">Sheet discipline</h2>
      <ul className="list-disc pl-5 space-y-1 text-sm text-secondary m-0">
        {lines.map((line, idx) => (
          <li key={idx} className="leading-relaxed">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
};
