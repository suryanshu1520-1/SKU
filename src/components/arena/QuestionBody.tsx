import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface QuestionBodyProps {
  subjectCategory?: string;
  examOriginTag?: string;
  questionText: string;
}

export const QuestionBody: React.FC<QuestionBodyProps> = ({
  subjectCategory,
  examOriginTag,
  questionText,
}) => {
  return (
    <div className="space-y-4">
      {/* Question Metadata Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-0.5 text-[9px] font-sans uppercase tracking-wider font-bold bg-surface-elevated text-[#e0d0ab] border border-border rounded-sm">
          {subjectCategory || 'CORE DOMAIN'}
        </span>
        {examOriginTag && (
          <span className="px-2.5 py-0.5 text-[9px] font-sans text-secondary border border-border rounded-sm">
            {examOriginTag}
          </span>
        )}
      </div>

      {/* Question Stem Typography - prominent and readable */}
      <div className="font-serif text-lg sm:text-xl leading-relaxed text-white prose prose-invert max-w-none tracking-normal">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {questionText}
        </Markdown>
      </div>
    </div>
  );
};
