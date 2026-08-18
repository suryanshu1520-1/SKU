import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Landmark, Coins, Globe2, Leaf, Cpu, History as HistoryIcon, ArrowUpRight } from 'lucide-react';

interface SyllabusDomain {
  id: string;
  name: string;
  weightage: string;
  questionsCount: number;
  icon: React.ElementType;
  highYieldTopics: string[];
}

const SYLLABUS_DOMAINS: SyllabusDomain[] = [
  {
    id: 'polity',
    name: 'Polity & Governance',
    weightage: '15-18%',
    questionsCount: 380,
    icon: Landmark,
    highYieldTopics: ['Fundamental Rights & Writs', 'Anti-Defection & Elections', 'Federal Relations', 'Judicial Review & Tribunals']
  },
  {
    id: 'economy',
    name: 'Economy & Finance',
    weightage: '14-16%',
    questionsCount: 320,
    icon: Coins,
    highYieldTopics: ['Monetary Transmission (RBI)', 'Fiscal Deficit & FRBM', 'External Sector & BOP', 'Banking NPAs & IBC']
  },
  {
    id: 'environment',
    name: 'Environment & Ecology',
    weightage: '16-20%',
    questionsCount: 340,
    icon: Leaf,
    highYieldTopics: ['UNFCCC & COP Decisions', 'Critically Endangered Species', 'Wildlife Protection Act', 'Carbon Credits & Renewable']
  },
  {
    id: 'sci-tech',
    name: 'Science & Emerging Tech',
    weightage: '10-12%',
    questionsCount: 260,
    icon: Cpu,
    highYieldTopics: ['Gene Editing (CRISPR)', 'Quantum Computing & Semiconductor', 'Space Exploration (ISRO)', 'AI & Digital Public Infra']
  },
  {
    id: 'geography',
    name: 'Geography & Mapping',
    weightage: '12-14%',
    questionsCount: 240,
    icon: Globe2,
    highYieldTopics: ['River Basins & Critical Minerals', 'Monsoon Teleconnections', 'Geopolitical Chokepoints', 'Soil Profiles & Agriculture']
  },
  {
    id: 'history',
    name: 'History & Heritage',
    weightage: '12-15%',
    questionsCount: 182,
    icon: HistoryIcon,
    highYieldTopics: ['Buddhism & Jainism Terminology', 'Temple Architecture Styles', 'Constitutional Movements (1920-47)', 'Land Revenue Systems']
  }
];

interface SyllabusMatrixProps {
  onSelectDomain?: (domainId: string) => void;
}

export default function SyllabusMatrix({ onSelectDomain }: SyllabusMatrixProps) {
  const [activeDomain, setActiveDomain] = useState<string>(SYLLABUS_DOMAINS[0].id);

  const selected = SYLLABUS_DOMAINS.find((d) => d.id === activeDomain) || SYLLABUS_DOMAINS[0];

  return (
    <div className="w-full bg-zinc-900/30 border border-zinc-800/80 rounded-sm p-6 backdrop-blur-sm shadow-xl">
      {/* Title */}
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#e0d0ab]" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#e0d0ab] font-bold">
              UPSC Syllabus Matrix & Item Coverage
            </h3>
          </div>
          <p className="text-zinc-500 text-[11px] font-sans mt-0.5">
            Real-time coverage breakdown across 1,720+ active assessment items
          </p>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 bg-zinc-800 text-emerald-400 border border-zinc-700 rounded-sm hidden sm:inline">
          100% Prelims Aligned
        </span>
      </div>

      {/* Grid of Domain Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {SYLLABUS_DOMAINS.map((domain) => {
          const Icon = domain.icon;
          const isActive = domain.id === activeDomain;

          return (
            <motion.button
              key={domain.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveDomain(domain.id);
                onSelectDomain?.(domain.id);
              }}
              className={`p-3 rounded-sm border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isActive
                  ? 'border-[#e0d0ab]/80 bg-[#e0d0ab]/10 text-stone-100 shadow-md shadow-[#e0d0ab]/5'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/70'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#e0d0ab]' : 'text-zinc-500'}`} />
                <span className="text-[9px] font-mono text-zinc-400">{domain.weightage}</span>
              </div>
              <div>
                <p className="text-[11px] font-mono font-semibold truncate">{domain.name}</p>
                <p className="text-[9px] font-mono text-zinc-400">{domain.questionsCount} items</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Domain High-Yield Deep Dive */}
      <motion.div
        key={selected.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#e0d0ab]">{selected.name}</span>
            <span className="text-[10px] font-mono text-zinc-500">&bull; Approx. {selected.weightage} of Prelims Score</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-zinc-500">High-Yield Foci:</span>
            {selected.highYieldTopics.map((topic, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-[10px] font-sans rounded-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0 font-mono text-xs text-zinc-400 flex items-center gap-1">
          <span>{selected.questionsCount} Questions Ready</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#e0d0ab]" />
        </div>
      </motion.div>
    </div>
  );
}
