import React from 'react';
import { motion } from 'motion/react';
import { Target } from 'lucide-react';
import type { CandidatePreferences } from '../../types';

interface TrainingSetupProps {
  candidatePreferences?: CandidatePreferences;
  allSubjects: string[];
  selectedSubjects: Set<string>;
  toggleSubject: (subject: string) => void;
  setSelectedSubjects: (subjects: Set<string>) => void;
  trainingLength: number;
  setTrainingLength: (len: number) => void;
  onBack: () => void;
  onLaunch: () => void;
}

export const TrainingSetup: React.FC<TrainingSetupProps> = ({
  candidatePreferences,
  allSubjects,
  selectedSubjects,
  toggleSubject,
  setSelectedSubjects,
  trainingLength,
  setTrainingLength,
  onBack,
  onLaunch,
}) => {
  const defaultLengths = [25, 35, 50];
  const candidateTarget = candidatePreferences?.dailyMcqTarget;
  const lengthOptions = Array.from(
    new Set(candidateTarget ? [candidateTarget, ...defaultLengths] : defaultLengths)
  ).sort((a, b) => a - b);

  return (
    <div className="w-full max-w-2xl mx-auto font-sans p-4 sm:p-6 space-y-6">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-elevated border border-border rounded-sm text-[10px] uppercase font-sans font-medium text-[#e0d0ab] tracking-wider">
        <Target className="w-3 h-3 text-[#e0d0ab]" />
        <span>Training Ground Configuration</span>
      </div>

      <h2 className="font-serif text-2xl font-bold text-white">Custom Domain & Volume Setup</h2>

      {/* Candidate Focus Alignment Banner */}
      {candidatePreferences?.focusPillars && candidatePreferences.focusPillars.length > 0 && (
        <div className="p-3.5 bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.35)] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
          <span className="text-[#8fa2bd] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>
              Aligned with Candidate Track:{' '}
              <strong className="text-[#e0d0ab]">
                {candidatePreferences.focusPillars.map((p) => p.toUpperCase()).join(', ')}
              </strong>
            </span>
          </span>
          <span className="text-xs text-[#e0d0ab] font-semibold shrink-0">
            Daily Target: {candidatePreferences.dailyMcqTarget} MCQs
          </span>
        </div>
      )}

      {/* Subject Selection */}
      <div className="p-6 bg-surface-elevated/30 border border-border rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
            Select Focus Subjects ({selectedSubjects.size} Selected)
          </h3>
          <button
            onClick={() => setSelectedSubjects(new Set(allSubjects))}
            className="text-xs font-sans text-[#0194a8] hover:text-[#e0d0ab] transition-colors cursor-pointer"
          >
            Select All
          </button>
        </div>

        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {allSubjects.map((subject) => (
            <button
              key={subject}
              onClick={() => toggleSubject(subject)}
              className={`px-3 py-1.5 text-xs font-sans font-medium rounded-md border transition-all cursor-pointer ${
                selectedSubjects.has(subject)
                  ? 'bg-[#e0d0ab] text-surface border-[#e0d0ab] font-bold'
                  : 'bg-surface-elevated border-border text-secondary hover:text-primary'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Question Count Selection */}
      <div className="p-6 bg-surface-elevated/30 border border-border rounded-md space-y-4">
        <h3 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
          Question Target
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {lengthOptions.map((count) => (
            <button
              key={count}
              onClick={() => setTrainingLength(count)}
              className={`py-3 text-sm font-sans font-bold uppercase rounded-md border transition-all cursor-pointer ${
                trainingLength === count
                  ? 'bg-[#0194a8] text-white border-[#0194a8]'
                  : 'bg-surface-elevated border-border text-secondary hover:text-primary'
              }`}
            >
              <span className="font-mono">{count}</span> MCQs
              {candidateTarget === count && (
                <span className="block text-xs font-sans text-[#e0d0ab] capitalize font-medium">
                  Daily Target
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-3 bg-surface-elevated hover:bg-surface-elevated border border-border text-primary font-sans text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          Back
        </motion.button>
        <motion.button
          onClick={onLaunch}
          disabled={selectedSubjects.size === 0}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-[#e0d0ab] hover:bg-white disabled:opacity-40 text-[#072e63] font-sans text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
        >
          <Target className="w-4 h-4" />
          <span>Launch Training Ground</span>
        </motion.button>
      </div>
    </div>
  );
};
