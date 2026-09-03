import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  X
} from 'lucide-react';
import canonData from '../data/humanities-canon.json';
import type { HumanitiesCanon, Thinker, Passage, PyqCitation } from '../types/humanities';
import ThinkerEngravingSvg from './ThinkerEngravingSvg';

const canon = canonData as HumanitiesCanon;

// Rich thinker metadata definitions
const THINKER_METADATA: Record<string, { era: string; workShort: string; workYear: number; voice: string; voiceCite: { paper: string; year: number } }> = {
  ambedkar: {
    era: '1891–1956',
    workShort: 'Annihilation of Caste',
    workYear: 1936,
    voice: 'Democracy is not merely a form of Government. It is primarily a mode of associated living, of conjoint communicated experience.',
    voiceCite: { paper: 'GS-IV', year: 2021 }
  },
  gandhi: {
    era: '1869–1948',
    workShort: 'Hind Swaraj',
    workYear: 1909,
    voice: 'Passive resistance is a method of securing rights by personal suffering; it is the reverse of resistance by arms.',
    voiceCite: { paper: 'GS-IV', year: 2019 }
  },
  kant: {
    era: '1724–1804',
    workShort: 'Metaphysic of Morals',
    workYear: 1785,
    voice: 'Act only on that maxim whereby thou canst at the same time will that it should become a universal law.',
    voiceCite: { paper: 'GS-IV', year: 2022 }
  },
  mill: {
    era: '1806–1873',
    workShort: 'On Liberty',
    workYear: 1859,
    voice: 'The only purpose for which power can be rightfully exercised over any member of a civilized community, against his will, is to prevent harm to others. Over himself, over his own body and mind, the individual is sovereign.',
    voiceCite: { paper: 'GS-IV', year: 2021 }
  },
  kautilya: {
    era: 'c. 375–283 BCE',
    workShort: 'Arthashastra',
    workYear: -300,
    voice: 'In the happiness of his subjects lies his happiness; in their welfare his welfare; whatever pleases himself he shall not consider as good, but whatever pleases his subjects he shall consider as good.',
    voiceCite: { paper: 'GS-IV', year: 2016 }
  },
  aristotle: {
    era: '384–322 BCE',
    workShort: 'Nicomachean Ethics',
    workYear: -350,
    voice: 'Happiness (Eudaimonia), then, is something final and self-sufficient, and is the end of action. We define human good as activity of soul exhibiting virtue.',
    voiceCite: { paper: 'GS-IV', year: 2017 }
  },
  rawls: {
    era: '1921–2002',
    workShort: 'A Theory of Justice',
    workYear: 1971,
    voice: 'Justice is the first virtue of social institutions, as truth is of systems of thought. Each person possesses an inviolability founded on justice that even the welfare of society as a whole cannot override.',
    voiceCite: { paper: 'GS-IV', year: 2019 }
  },
  vivekananda: {
    era: '1863–1902',
    workShort: 'Karma Yoga',
    workYear: 1896,
    voice: 'The poor, the illiterate, the afflicted—let these be your God; know that service to these alone is the highest religion. It is not the receiver that is blessed, but the giver.',
    voiceCite: { paper: 'GS-IV', year: 2021 }
  },
  tagore: {
    era: '1861–1941',
    workShort: 'Nationalism',
    workYear: 1917,
    voice: 'Where the mind is without fear and the head is held high; Where knowledge is free; Where the world has not been broken up into fragments by narrow domestic walls.',
    voiceCite: { paper: 'Essay', year: 2022 }
  },
  rousseau: {
    era: '1712–1778',
    workShort: 'The Social Contract',
    workYear: 1762,
    voice: 'Man is born free; and everywhere he is in chains. The problem is to find a form of association which will defend and protect with the whole common force the person and goods of each associate.',
    voiceCite: { paper: 'GS-IV', year: 2019 }
  }
};

const GOLD = '#e0d0ab';
const DOTS = [
  [6, 18, 2, 9],
  [14, 62, 1.5, 11],
  [23, 34, 2, 13],
  [31, 78, 1.5, 8],
  [39, 12, 2.5, 12],
  [47, 55, 1.5, 10],
  [56, 26, 2, 14],
  [63, 70, 1.5, 9],
  [71, 40, 2, 12],
  [79, 15, 1.5, 11],
  [86, 60, 2, 13],
  [93, 33, 1.5, 10]
];

const PAPERS = ['GS-I', 'GS-II', 'GS-IV', 'Essay'];
const YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

const TRADITIONS: Record<string, { label: string; ids: string[] }> = {
  ALL: { label: 'All Thinkers', ids: [] },
  INDIAN: { label: 'Indian Moral & Political Thought', ids: ['ambedkar', 'gandhi', 'kautilya', 'vivekananda', 'tagore'] },
  WESTERN: { label: 'Western Ethics & Philosophy', ids: ['kant', 'mill', 'aristotle', 'rawls', 'rousseau'] },
  JUSTICE: { label: 'Justice & Constitutional Liberty', ids: ['ambedkar', 'rawls', 'mill', 'rousseau', 'kautilya'] },
};

// Pure helper functions preserved for contract & unit test verification
export function togglePinPassage(currentPinned: Passage[], passage: Passage): Passage[] {
  const isAlreadyPinned = currentPinned.some((p) => p.id === passage.id);
  if (isAlreadyPinned) {
    return currentPinned.filter((p) => p.id !== passage.id);
  }
  return [...currentPinned, passage];
}

export function isPassagePinned(pinnedList: Passage[], passageId: string): boolean {
  return pinnedList.some((p) => p.id === passageId);
}

export default function HumanitiesReader() {
  const [mode, setMode] = useState<'hall' | 'read'>('hall');
  const [activeId, setActiveId] = useState<string>('ambedkar');
  const [readId, setReadId] = useState<string>('ambedkar');
  const [readIdx, setReadIdx] = useState<number>(0);
  const [pinned, setPinned] = useState<string[]>([]);
  const [query, setQuery] = useState<string>('');
  const [paper, setPaper] = useState<string>('ALL');
  const [year, setYear] = useState<string>('ALL');
  const [tradition, setTradition] = useState<string>('ALL');
  const [benchOpen, setBenchOpen] = useState<boolean>(false);
  const [typed, setTyped] = useState<number>(0);
  const [reduced, setReduced] = useState<boolean>(false);
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [copiedPassage, setCopiedPassage] = useState<boolean>(false);
  const [copiedSynthesis, setCopiedSynthesis] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Resize & Reduced Motion listeners
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onMq);

    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);

    return () => {
      mq.removeEventListener('change', onMq);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const findThinker = useCallback((id: string): Thinker => {
    return canon.thinkers.find((x) => x.id === id) || canon.thinkers[0];
  }, []);

  // Voice typewriter effect when attending a thinker
  useEffect(() => {
    const meta = THINKER_METADATA[activeId];
    if (!meta || !meta.voice) return;

    if (reduced) {
      setTyped(meta.voice.length);
      return;
    }

    setTyped(0);
    const step = 17;
    const voiceInterval = setInterval(() => {
      setTyped((prev) => {
        if (prev >= meta.voice.length) {
          clearInterval(voiceInterval);
          return prev;
        }
        return prev + 1;
      });
    }, step);

    return () => clearInterval(voiceInterval);
  }, [activeId, reduced]);

  const attend = (id: string) => {
    if (activeId === id) return;
    setActiveId(id);
  };

  const openRead = (id: string, idx: number = 0) => {
    setMode('read');
    setReadId(id);
    setReadIdx(idx);
    setActiveId(id);
  };

  const exitRead = () => {
    setMode('hall');
  };

  const stepPassage = (delta: number) => {
    const t = findThinker(readId);
    const n = t.passages.length;
    setReadIdx((prev) => (prev + delta + n) % n);
  };

  const stepThinker = (delta: number) => {
    const list = canon.thinkers;
    const i = list.findIndex((x) => x.id === activeId);
    const next = list[(i + delta + list.length) % list.length];
    if (mode === 'read') {
      openRead(next.id, 0);
    } else {
      attend(next.id);
    }
  };

  const togglePin = (pid: string) => {
    setPinned((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  };

  const current = useCallback(() => {
    const t = findThinker(readId);
    const p = t.passages[Math.min(readIdx, t.passages.length - 1)] || t.passages[0];
    return { t, p };
  }, [readId, readIdx, findThinker]);

  const copyPassage = () => {
    const { t, p } = current();
    const c = p.pyqCitations[0];
    const tail = c ? ` [UPSC ${c.paper} ${c.year}]` : '';
    const text = `"${p.text}"\n— ${t.name}, ${t.workTitle} (${t.year})${tail}`;
    try {
      navigator.clipboard.writeText(text);
    } catch {}
    setCopiedPassage(true);
    setTimeout(() => setCopiedPassage(false), 1700);
  };

  const copySynthesis = () => {
    let out = '# Cross-thinker synthesis\n\n';
    canon.thinkers.forEach((t) => {
      const items = t.passages.filter((p) => pinned.includes(p.id));
      if (!items.length) return;
      out += `## ${t.name} — ${t.workTitle} (${t.year})\n`;
      items.forEach((p) => {
        out += `> "${p.text}"\n`;
        p.pyqCitations.forEach((c) => {
          out += `> — UPSC ${c.paper} ${c.year}\n`;
        });
        out += '\n';
      });
    });
    try {
      navigator.clipboard.writeText(out);
    } catch {}
    setCopiedSynthesis(true);
    setTimeout(() => setCopiedSynthesis(false), 1700);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }

      const k = e.key;
      if (k === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (k === 'b' || k === 'B') {
        e.preventDefault();
        setBenchOpen((prev) => !prev);
        return;
      }

      if (mode === 'hall') {
        if (k === 'ArrowRight' || k === 'ArrowDown') {
          e.preventDefault();
          stepThinker(1);
        } else if (k === 'ArrowLeft' || k === 'ArrowUp') {
          e.preventDefault();
          stepThinker(-1);
        } else if (k === 'Enter') {
          e.preventDefault();
          openRead(activeId, 0);
        }
      } else {
        if (k === 'Escape') {
          e.preventDefault();
          exitRead();
        } else if (k === 'ArrowRight' || k === 'ArrowDown') {
          e.preventDefault();
          stepPassage(1);
        } else if (k === 'ArrowLeft' || k === 'ArrowUp') {
          e.preventDefault();
          stepPassage(-1);
        } else if (k === 'p' || k === 'P') {
          e.preventDefault();
          const { p } = current();
          togglePin(p.id);
        } else if (k === 'c' || k === 'C') {
          e.preventDefault();
          copyPassage();
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, activeId, readId, readIdx, current]);

  const matchesWith = useCallback(
    (t: Thinker, p: Passage, s: { paper: string; year: string; query: string }) => {
      if (s.paper !== 'ALL' && !p.pyqCitations.some((c) => c.paper === s.paper)) return false;
      if (s.year !== 'ALL' && !p.pyqCitations.some((c) => String(c.year) === s.year)) return false;
      const q = (s.query || '').trim().toLowerCase();
      if (q) {
        const hay = (
          p.text +
          ' ' +
          t.name +
          ' ' +
          t.workTitle +
          ' ' +
          p.pyqCitations.map((c) => `${c.paper} ${c.year} ${c.note || ''}`).join(' ')
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    },
    []
  );

  const matches = useCallback(
    (t: Thinker, p: Passage) => {
      return matchesWith(t, p, { paper, year, query });
    },
    [paper, year, query, matchesWith]
  );

  const applyLens = (patch: Partial<{ paper: string; year: string; query: string }>) => {
    const next = { paper, year, query, ...patch };
    if (patch.paper !== undefined) setPaper(patch.paper);
    if (patch.year !== undefined) setYear(patch.year);
    if (patch.query !== undefined) setQuery(patch.query);

    const list = canon.thinkers;
    const stillHas = (t: Thinker) => t.passages.some((p) => matchesWith(t, p, next));
    const active = findThinker(activeId);
    if (active && !stillHas(active)) {
      const first = list.find(stillHas);
      if (first) {
        setActiveId(first.id);
      }
    }
  };

  const list = canon.thinkers;
  const narrow = vw < 900;
  const ambient = !reduced;
  const measure = '690px';

  const lensOn = paper !== 'ALL' || year !== 'ALL' || !!query.trim();
  let hits = 0;
  list.forEach((t) => {
    t.passages.forEach((p) => {
      if (matches(t, p)) hits++;
    });
  });

  const dots = DOTS.map((d) => ({
    left: `${d[0]}%`,
    top: `${d[1]}%`,
    size: `${d[2]}px`,
    anim: ambient ? `drift ${d[3]}s ease-in-out infinite` : 'none'
  }));

  const lenses = [
    { label: 'ALL', on: paper === 'ALL' && year === 'ALL', act: () => applyLens({ paper: 'ALL', year: 'ALL' }) },
    ...PAPERS.map((p) => ({ label: p, on: paper === p, act: () => applyLens({ paper: paper === p ? 'ALL' : p }) })),
    ...YEARS.map((y) => ({ label: String(y), on: year === String(y), act: () => applyLens({ year: year === String(y) ? 'ALL' : String(y) }) }))
  ];

  const thinkers = list.map((t) => {
    const isActive = t.id === activeId;
    const meta = THINKER_METADATA[t.id] || {
      era: 'Canonical Era',
      workShort: t.workTitle,
      workYear: t.year,
      voice: t.passages[0]?.text.slice(0, 120) || '',
      voiceCite: { paper: 'GS-IV', year: 2021 }
    };

    const tHits = t.passages.filter((p) => matches(t, p));
    const faded = lensOn && tHits.length === 0;
    const done = typed >= meta.voice.length;
    const typedText = isActive ? meta.voice.slice(0, typed) : '';

    const open = () => openRead(t.id, 0);
    const attendOrOpen = () => {
      if (isActive) open();
      else attend(t.id);
    };

    return {
      id: t.id,
      name: t.name,
      era: meta.era,
      work: meta.workShort,
      workYear: meta.workYear,
      aria: `${t.name}, ${meta.workShort} — ${t.passages.length} passages`,
      isActive,
      isDim: !isActive,
      typed: typedText,
      caretDisplay: !done && !reduced ? 'inline-block' : 'none',
      stampOpacity: done ? 1 : 0,
      stamp: `UPSC ${meta.voiceCite.paper} · ${meta.voiceCite.year}`,
      leaderAnim: done && !reduced ? 'leader .5s ease-out both' : 'none',
      voiceSize: narrow ? '15px' : '19px',
      flex: narrow ? '0 0 auto' : (isActive ? '2.5' : '1'),
      minH: narrow ? 'auto' : '470px',
      pad: narrow ? '20px 18px' : (isActive ? '44px 34px 30px' : '44px 16px 26px'),
      innerDir: narrow ? ('row' as const) : ('column' as const),
      innerAlign: narrow ? ('flex-start' as const) : (isActive ? ('flex-start' as const) : ('center' as const)),
      innerGap: narrow ? '15px' : '20px',
      textAlign: narrow ? ('flex-start' as const) : (isActive ? ('flex-start' as const) : ('center' as const)),
      textAlignCss: narrow ? ('left' as const) : (isActive ? ('left' as const) : ('center' as const)),
      portraitPx: narrow ? '76px' : (isActive ? '196px' : '116px'),
      nameSize: narrow ? '17px' : (isActive ? '30px' : '17px'),
      nameColor: isActive ? GOLD : '#c8b998',
      workColor: '#9fb0c8',
      metaColor: isActive ? '#9fb0c8' : '#8fa2bd',
      citeCount: `${tHits.length} ${lensOn ? 'MATCH' : 'PYQ'}`,
      border: isActive ? 'rgba(224,208,171,.5)' : 'rgba(19,108,153,.5)',
      bg: isActive
        ? 'linear-gradient(165deg,rgba(11,61,120,.55) 0%,rgba(4,25,54,.9) 100%)'
        : 'rgba(4,25,54,.45)',
      shadow: isActive ? '0 26px 70px rgba(0,0,0,.5), inset 0 1px 0 rgba(224,208,171,.14)' : 'none',
      opacity: faded ? (isActive ? '0.55' : '0.3') : '1',
      stroke: isActive ? GOLD : '#0194a8',
      stroke2: isActive ? '#c8b998' : '#136c99',
      accent: isActive ? GOLD : '#0194a8',
      lensFill: isActive ? 'rgba(224,208,171,.1)' : 'none',
      guideOpacity: isActive ? 0.26 : 0.12,
      portraitGlow: isActive ? 'drop-shadow(0 0 26px rgba(224,208,171,.22))' : 'none',
      dimHint: faded ? 'no match in this lens' : 'attend →',
      onAttend: () => attend(t.id),
      onAttendOrOpen: attendOrOpen,
      ticks: t.passages.map((p, i) => {
        const hit = matches(t, p);
        const go = () => openRead(t.id, i);
        return {
          id: p.id,
          label: `§${String(i + 1).padStart(2, '0')}`,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            go();
          },
          bg: pinned.includes(p.id) ? 'rgba(224,208,171,.16)' : 'rgba(3,18,42,.55)',
          color: hit ? '#c8b998' : '#8fa2bd',
          border: hit ? 'rgba(1,148,168,.5)' : 'rgba(19,108,153,.35)'
        };
      })
    };
  });

  const activeThinker = thinkers.find((t) => t.id === activeId) || thinkers[0];
  const filteredThinkers = thinkers.filter((t) => {
    if (tradition === 'ALL') return true;
    const allowed = TRADITIONS[tradition]?.ids || [];
    return allowed.includes(t.id);
  });

  const { t: rt, p: rp } = current();
  const read = rt && rp ? {
    id: rt.id,
    thinkerName: rt.name,
    workTitle: rt.workTitle,
    workYear: rt.year,
    pdBasis: rt.publicDomainBasis,
    dropCap: rp.text.trim().charAt(0),
    body: rp.text.trim().slice(1),
    indexLabel: `PASSAGE ${String(readIdx + 1).padStart(2, '0')} OF ${String(rt.passages.length).padStart(2, '0')}`,
    progress: `${Math.round(((readIdx + 1) / rt.passages.length) * 100)}%`,
    hasCite: rp.pyqCitations.length > 0,
    noCite: rp.pyqCitations.length === 0,
    citations: rp.pyqCitations,
    pinLabel: pinned.includes(rp.id) ? '✓ On the bench' : 'Pin to bench · P',
    pinBg: pinned.includes(rp.id) ? GOLD : 'transparent',
    pinColor: pinned.includes(rp.id) ? '#072e63' : GOLD,
    pinBorder: GOLD,
    copyLabel: copiedPassage ? '✓ Copied' : 'Copy for answer · C',
    onPin: () => togglePin(rp.id),
    onCopy: () => copyPassage()
  } : null;

  const benchGroups = list
    .map((t) => {
      const items = t.passages.filter((p) => pinned.includes(p.id));
      if (!items.length) return null;
      return {
        name: t.name,
        work: `${t.workTitle} · ${t.year}`,
        items: items.map((p) => {
          const idx = t.passages.indexOf(p);
          const go = () => {
            openRead(t.id, idx);
            setBenchOpen(false);
          };
          const rm = () => togglePin(p.id);
          return {
            id: p.id,
            cite: p.pyqCitations.length
              ? `UPSC ${p.pyqCitations[0].paper} · ${p.pyqCitations[0].year}`
              : 'NO PYQ CITATION',
            snippet: `“${p.text.slice(0, 170).trim()}…”`,
            onOpen: go,
            onRemove: rm
          };
        })
      };
    })
    .filter(Boolean);

  const benchChips: Array<{ label: string; onOpen: () => void }> = [];
  list.forEach((t) => {
    t.passages.forEach((p, i) => {
      if (!pinned.includes(p.id)) return;
      const go = () => openRead(t.id, i);
      benchChips.push({
        label: `${t.name.split(' ').pop()?.toUpperCase()} §${String(i + 1).padStart(2, '0')}`,
        onOpen: go
      });
    });
  });

  const spine = list.map((t) => {
    const go = () => openRead(t.id, 0);
    const on = t.id === readId;
    return {
      id: t.id,
      name: t.name,
      onClick: go,
      bar: on ? GOLD : 'rgba(19,108,153,.6)',
      bg: on ? 'rgba(224,208,171,.08)' : 'transparent',
      color: on ? GOLD : '#9fb0c8'
    };
  });

  const matchLine = !lensOn
    ? `${list.length} thinkers · ${list.reduce((a, t) => a + t.passages.length, 0)} verbatim passages`
    : hits === 0
    ? 'No passage was asked under this combination'
    : `${hits} passage${hits === 1 ? '' : 's'} match this lens`;

  const matchColor = !lensOn ? '#9fb0c8' : hits === 0 ? '#e14e4e' : GOLD;
  const showClear = lensOn;

  return (
    <div className="relative w-full text-stone-200 font-sans pb-28 selection:bg-[#e0d0ab] selection:text-[#072e63]">

      {/* ── Keyframe Animations embedded ── */}
      <style>{`
        @keyframes drift { 0% { transform: translateY(0); opacity: .35; } 50% { transform: translateY(-16px); opacity: .9; } 100% { transform: translateY(0); opacity: .35; } }
        @keyframes caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes leader { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      `}</style>

      {/* ── Ambient Constellation Particle Atmosphere ── */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        {dots.map((d, idx) => (
          <span
            key={idx}
            style={{
              position: 'absolute',
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size,
              borderRadius: '50%',
              backgroundColor: '#7fd4e0',
              opacity: 0.4,
              animation: d.anim
            }}
          />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODE 1: THE HALL OF THINKERS
          ══════════════════════════════════════════════════════════════════ */}
      {mode === 'hall' && (
        <section
          className="relative z-10 max-w-[1460px] mx-auto"
          style={{ padding: narrow ? '30px 18px 26px' : '52px 30px 30px' }}
        >
          {/* Header & Lens Control */}
          <div className="flex items-end justify-between gap-8 flex-wrap mb-8">
            <div style={{ animation: 'rise .6s ease-out both' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-[26px] h-px bg-[#0194a8]" />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#0194a8]">
                  The Philosophical Canon
                </span>
              </div>
              <h1
                className="font-serif font-light text-[#e0d0ab] m-0 tracking-tight"
                style={{ fontSize: narrow ? '30px' : '52px', lineHeight: 1.1 }}
              >
                Sit with the thinkers<br />
                <span className="italic text-[#9fb0c8]">the examiner keeps returning to.</span>
              </h1>
              <p className="mt-4 m-0 max-w-[540px] text-[13.5px] leading-[1.75] text-[#9fb0c8]">
                Every line is a verbatim excerpt from the primary text, carrying the exact paper and year it has been drawn from. Give a thinker your attention — hover, tap or tab — and they speak first.
              </p>
            </div>

            {/* Lens Box */}
            <div
              className="flex flex-col gap-3 items-start min-w-[290px]"
              style={{ flex: narrow ? '1 1 100%' : '0 1 340px' }}
            >
              <div className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => applyLens({ query: e.target.value })}
                  placeholder="Search the canon — text, thinker or citation"
                  className="w-full py-[11px] pr-[14px] pl-[32px] bg-[rgba(3,18,42,.8)] border border-[rgba(1,148,168,.5)] focus:border-[#e0d0ab] rounded-[2px] text-[#e0d0ab] text-[12.5px] outline-none font-sans transition-colors"
                />
                <span className="absolute left-[11px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0194a8] pointer-events-none">
                  <Search className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex flex-wrap gap-[5px] items-center">
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#8fa2bd] uppercase mr-[3px]">
                  Lens
                </span>
                {lenses.map((l, lIdx) => (
                  <span
                    key={lIdx}
                    role="button"
                    tabIndex={0}
                    onClick={l.act}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        l.act();
                      }
                    }}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10.5px',
                      letterSpacing: '.05em',
                      border: `1px solid ${l.on ? GOLD : 'rgba(1,148,168,.4)'}`,
                      background: l.on ? GOLD : 'rgba(3,18,42,.6)',
                      color: l.on ? '#072e63' : '#9fb0c8',
                      transition: 'all .2s'
                    }}
                  >
                    {l.label}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-[9px] flex-wrap">
                <span className="font-mono text-[10px] tracking-[0.04em]" style={{ color: matchColor }}>
                  {matchLine}
                </span>
                {showClear && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => applyLens({ paper: 'ALL', year: 'ALL', query: '' })}
                    className="font-mono text-[9.5px] tracking-[0.1em] text-[#9fb0c8] hover:text-[#e0d0ab] cursor-pointer border-b border-[rgba(159,176,200,.5)] hover:border-[#e0d0ab]"
                  >
                    ✕ CLEAR LENS
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              TIER 1: THE ACTIVE THINKER SPOTLIGHT MONUMENT (MASTER CHAMBER)
              ══════════════════════════════════════════════════════════════════ */}
          {activeThinker && (
            <div className="relative p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-[rgba(4,25,54,0.95)] via-[rgba(7,46,99,0.65)] to-[rgba(4,25,54,0.98)] border border-[rgba(224,208,171,0.45)] rounded-xs shadow-[0_24px_70px_rgba(0,0,0,0.7)] mb-10 overflow-hidden backdrop-blur-xl">
              {/* Radial ambient highlight */}
              <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[rgba(1,148,168,0.18)] via-transparent to-transparent pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                {/* Col 1: Majestic Portrait Engraving (Spacious 200px Canvas) */}
                <div className="lg:col-span-3 flex flex-col items-center justify-center">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openRead(activeThinker.id, 0)}
                    className="relative w-44 h-44 sm:w-52 sm:h-52 cursor-pointer transition-transform hover:scale-105"
                    style={{ filter: activeThinker.portraitGlow }}
                    title={`Open ${activeThinker.name}'s Reading Chamber`}
                  >
                    <ThinkerEngravingSvg
                      who={activeThinker.id}
                      stroke={GOLD}
                      stroke2="#c8b998"
                      accent={GOLD}
                      lensFill="rgba(224,208,171,0.12)"
                      guideOpacity={0.28}
                      className="w-full h-full"
                    />
                  </div>
                  <motion.button
                    onClick={() => openRead(activeThinker.id, 0)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-3.5 px-4 py-2 bg-[rgba(3,18,42,0.85)] hover:bg-[#e0d0ab] text-[#9fb0c8] hover:text-[#072e63] border border-[rgba(1,148,168,0.5)] hover:border-[#e0d0ab] text-xs font-sans font-semibold rounded-md uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                    <span>Open Full Work</span>
                    <motion.span
                      className="inline-block"
                      whileHover={{ x: 3 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      →
                    </motion.span>
                  </motion.button>
                </div>

                {/* Col 2: Thinker Display, Work & Live Typewriter Voice */}
                <div className="lg:col-span-6 flex flex-col items-start min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-2.5 py-0.5 rounded-xs bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.4)] text-[#9fb0c8] font-mono text-[10px] uppercase tracking-wider">
                      {activeThinker.era}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-xs bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 text-[#e0d0ab] font-mono text-[10px] uppercase tracking-wider">
                      {activeThinker.citeCount}
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#e0d0ab] font-normal tracking-tight m-0 leading-tight">
                    {activeThinker.name}
                  </h2>
                  <div className="font-serif italic text-sm text-[#9fb0c8] mt-1 mb-4">
                    {activeThinker.work} · {activeThinker.workYear}
                  </div>

                  {/* Live Typewriter Voice Excerpt */}
                  <div className="relative w-full pl-5 border-l-2 border-[#e0d0ab]/40 my-2">
                    <span className="absolute left-1 -top-3 font-serif text-3xl text-[#e0d0ab]/30 select-none">“</span>
                    <p className="font-serif font-light text-sm sm:text-base text-[#f0e8d8] leading-relaxed m-0">
                      {activeThinker.typed}
                      <span
                        style={{
                          display: activeThinker.caretDisplay,
                          width: '2px',
                          height: '.95em',
                          backgroundColor: '#e0d0ab',
                          verticalAlign: 'text-bottom',
                          marginLeft: '3px',
                          animation: 'caret 1s step-end infinite',
                        }}
                      />
                    </p>
                  </div>

                  {/* UPSC Citation Stamp */}
                  <div
                    className="flex items-center gap-2.5 mt-3 transition-opacity duration-500"
                    style={{ opacity: activeThinker.stampOpacity }}
                  >
                    <span className="px-2.5 py-0.5 rounded-xs bg-[#e0d0ab] text-[#072e63] font-mono font-bold text-[10px] tracking-wider uppercase shadow-sm">
                      {activeThinker.stamp}
                    </span>
                    <span className="font-mono text-[10px] text-[#9fb0c8] tracking-wide">
                      drawn from this primary passage
                    </span>
                  </div>
                </div>

                {/* Col 3: Direct Passage Jump Index & Quick Actions */}
                <div className="lg:col-span-3 flex flex-col justify-between h-full p-4 bg-[rgba(3,18,42,0.7)] border border-[rgba(19,108,153,0.35)] rounded-md gap-4 shadow-inner">
                  <div>
                    <div className="font-sans text-xs uppercase tracking-wider text-[#0194a8] font-semibold mb-2.5 flex items-center justify-between">
                      <span>Verbatim Passages</span>
                      <span className="text-[#e0d0ab] font-bold font-mono">({activeThinker.ticks.length})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1">
                      {activeThinker.ticks.map((k, idx) => (
                        <motion.button
                          key={k.id}
                          onClick={k.onClick}
                          whileHover={{ scale: 1.03, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          className="px-2.5 py-2 bg-[rgba(7,46,99,0.35)] hover:bg-[#e0d0ab]/15 border border-[rgba(19,108,153,0.35)] hover:border-[#e0d0ab] rounded-md font-sans text-xs text-[#c8b998] hover:text-[#e0d0ab] flex items-center justify-between transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                        >
                          <span className="font-semibold">{k.label}</span>
                          <span className="text-xs font-mono text-[#8fa2bd]">§{idx + 1}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[rgba(19,108,153,0.3)]">
                    <motion.button
                      onClick={() => openRead(activeThinker.id, 0)}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full py-2.5 px-4 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans font-bold text-xs uppercase tracking-wider rounded-md transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                    >
                      {/* Luminous Shimmer Wave */}
                      <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                        animate={{ x: ['100%', '-100%'] }}
                        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                      />
                      <span className="relative z-10">Enter Reading Chamber</span>
                      <motion.span
                        className="relative z-10 inline-block font-mono text-sm"
                        whileHover={{ x: 2, y: 1 }}
                      >
                        ↵
                      </motion.span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TIER 2: THE LIVING PANTHEON GALLERY GRID (RESPONSIVE & EXPANSIVE)
              ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0194a8]" />
                  <h3 className="font-serif text-lg text-[#e0d0ab] m-0 font-normal">
                    The Living Pantheon
                  </h3>
                  <span className="font-mono text-xs text-[#9fb0c8]">
                    ({filteredThinkers.length} Classical & Modern Pillars)
                  </span>
                </div>
                <p className="text-xs text-[#8fa2bd] mt-0.5 mb-0">
                  Select any thinker to focus in the Master Chamber, or double-click to read their passages directly.
                </p>
              </div>

              {/* Tradition / Domain Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(TRADITIONS).map(([key, item]) => {
                  const active = tradition === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTradition(key)}
                      className={`px-3 py-1 font-mono text-[10.5px] rounded-xs uppercase tracking-wider transition-all cursor-pointer border ${
                        active
                          ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                          : 'bg-[rgba(3,18,42,0.6)] text-[#9fb0c8] border-[rgba(19,108,153,0.4)] hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generous 5-Column Responsive Card Grid (No horizontal claustrophobia!) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredThinkers.map((t) => {
                const isCurrentActive = t.id === activeId;
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    aria-label={t.aria}
                    onClick={() => attend(t.id)}
                    onDoubleClick={() => openRead(t.id, 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        attend(t.id);
                      }
                    }}
                    className={`relative p-4 sm:p-5 rounded-xs transition-all duration-300 flex flex-col items-center justify-between text-center cursor-pointer select-none group min-h-[260px] ${
                      isCurrentActive
                        ? 'bg-gradient-to-b from-[rgba(11,61,120,0.6)] to-[rgba(4,25,54,0.95)] border-2 border-[#e0d0ab] shadow-[0_12px_36px_rgba(224,208,171,0.25)]'
                        : 'bg-[rgba(4,25,54,0.65)] hover:bg-[rgba(7,46,99,0.5)] border border-[rgba(19,108,153,0.4)] hover:border-[#0194a8] shadow-md hover:-translate-y-1'
                    }`}
                  >
                    {/* Top metadata row */}
                    <div className="w-full flex items-center justify-between text-[9.5px] font-mono text-[#8fa2bd] mb-2">
                      <span className="truncate max-w-[100px]">{t.era}</span>
                      <span className={isCurrentActive ? 'text-[#e0d0ab] font-bold' : ''}>
                        {t.citeCount}
                      </span>
                    </div>

                    {/* SVG Portrait Engraving */}
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 my-1 transition-transform group-hover:scale-105"
                      style={{ filter: isCurrentActive ? 'drop-shadow(0 0 16px rgba(224,208,171,0.3))' : 'none' }}
                    >
                      <ThinkerEngravingSvg
                        who={t.id}
                        stroke={isCurrentActive ? GOLD : '#0194a8'}
                        stroke2={isCurrentActive ? '#c8b998' : '#136c99'}
                        accent={isCurrentActive ? GOLD : '#0194a8'}
                        lensFill={isCurrentActive ? 'rgba(224,208,171,0.1)' : 'none'}
                        guideOpacity={isCurrentActive ? 0.28 : 0.14}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Thinker Name & Work */}
                    <div className="w-full mt-2">
                      <h4
                        className={`font-serif text-sm font-normal tracking-tight leading-snug m-0 transition-colors ${
                          isCurrentActive ? 'text-[#e0d0ab] font-semibold' : 'text-[#f0e8d8] group-hover:text-[#e0d0ab]'
                        }`}
                      >
                        {t.name}
                      </h4>
                      <div className="font-serif italic text-[11px] text-[#9fb0c8] truncate mt-0.5">
                        {t.work} · {t.workYear}
                      </div>
                    </div>

                    {/* Bottom Status / Action Indicator */}
                    <div className="w-full mt-3 pt-2 border-t border-[rgba(19,108,153,0.25)] flex items-center justify-center">
                      {isCurrentActive ? (
                        <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#e0d0ab] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e0d0ab] animate-pulse" />
                          <span>In Spotlight</span>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRead(t.id, 0);
                          }}
                          className="font-mono text-[9.5px] uppercase tracking-wider text-[#8fa2bd] group-hover:text-[#e0d0ab] transition-colors cursor-pointer"
                        >
                          Read Work →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Hotkeys Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              flexWrap: 'wrap',
              marginTop: '20px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9.5px',
              letterSpacing: '.08em',
              color: '#8fa2bd'
            }}
          >
            <span>← → THINKER</span>
            <span>↵ READ</span>
            <span>/ SEARCH</span>
            <span>B BENCH</span>
            <span style={{ color: '#41536e' }}>·</span>
            <span style={{ letterSpacing: '.02em' }}>hover, tap or tab — all the same door</span>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODE 2: THE MONASTIC READING CHAMBER
          ══════════════════════════════════════════════════════════════════ */}
      {mode === 'read' && read && (
        <section style={{ position: 'relative', zIndex: 10 }}>
          {/* Ambient Background Watermark */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: narrow ? '120px' : '80px',
              left: narrow ? '50%' : '62%',
              transform: 'translateX(-50%)',
              width: narrow ? '340px' : '620px',
              height: narrow ? '340px' : '620px',
              opacity: 0.075,
              pointerEvents: 'none'
            }}
          >
            <ThinkerEngravingSvg
              who={read.id}
              stroke="#e0d0ab"
              stroke2="#c8b998"
              accent="#e0d0ab"
              guideOpacity={0.55}
              className="w-full h-full"
            />
          </div>

          <div
            style={{
              position: 'relative',
              display: 'flex',
              gap: '34px',
              alignItems: 'flex-start',
              padding: narrow ? '26px 18px 30px' : '46px 30px 40px',
              maxWidth: '1460px',
              margin: '0 auto'
            }}
          >
            {/* Sticky Left Spine */}
            <div
              style={{
                display: narrow ? 'none' : 'flex',
                flexDirection: 'column',
                gap: '3px',
                width: '156px',
                flex: 'none',
                position: 'sticky',
                top: '96px',
                animation: 'rise .5s ease-out both'
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '.2em',
                  color: '#8fa2bd',
                  marginBottom: '9px'
                }}
              >
                THE CANON
              </div>
              {spine.map((sp) => (
                <span
                  key={sp.id}
                  role="button"
                  tabIndex={0}
                  onClick={sp.onClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      sp.onClick();
                    }
                  }}
                  className="hover:text-[#e0d0ab]"
                  style={{
                    padding: '8px 11px',
                    borderLeft: `2px solid ${sp.bar}`,
                    background: sp.bg,
                    color: sp.color,
                    fontFamily: 'Merriweather, serif',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all .2s'
                  }}
                >
                  {sp.name}
                </span>
              ))}

              <div style={{ marginTop: '22px', height: '1px', background: 'rgba(19,108,153,.45)' }} />
              <div
                style={{
                  marginTop: '14px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  lineHeight: 1.8,
                  letterSpacing: '.04em',
                  color: '#8fa2bd'
                }}
              >
                {read.pdBasis}
              </div>
            </div>

            {/* Reading Measure Center Container */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
              <article style={{ width: '100%', maxWidth: measure, animation: 'rise .55s ease-out both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={exitRead}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        exitRead();
                      }
                    }}
                    className="hover:text-[#e0d0ab] hover:border-[#e0d0ab]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '9.5px',
                      letterSpacing: '.14em',
                      color: '#9fb0c8',
                      cursor: 'pointer',
                      border: '1px solid rgba(1,148,168,.45)',
                      padding: '5px 10px',
                      borderRadius: '2px',
                      transition: 'all .2s'
                    }}
                  >
                    ESC — BACK TO THE HALL
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '9.5px',
                      letterSpacing: '.12em',
                      color: '#8fa2bd'
                    }}
                  >
                    {read.indexLabel}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ height: '2px', background: 'rgba(19,108,153,.4)', marginBottom: '36px' }}>
                  <div
                    style={{
                      height: '2px',
                      width: read.progress,
                      background: '#e0d0ab',
                      transition: 'width .4s cubic-bezier(.4,0,.2,1)'
                    }}
                  />
                </div>

                <h2
                  style={{
                    fontFamily: 'Merriweather, serif',
                    fontWeight: 300,
                    fontSize: narrow ? '28px' : '40px',
                    lineHeight: 1.15,
                    color: '#e0d0ab',
                    margin: '0 0 7px',
                    letterSpacing: '-.01em'
                  }}
                >
                  {read.thinkerName}
                </h2>
                <div
                  style={{
                    fontFamily: 'Merriweather, serif',
                    fontStyle: 'italic',
                    fontSize: '13.5px',
                    color: '#9fb0c8',
                    marginBottom: '38px'
                  }}
                >
                  {read.workTitle} · {read.workYear}
                </div>

                {/* Primary Passage Text with Drop-Cap */}
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'Merriweather, serif',
                    fontWeight: 300,
                    fontSize: narrow ? '17px' : '20px',
                    lineHeight: 1.9,
                    color: '#e8e0cf'
                  }}
                >
                  <span
                    style={{
                      float: 'left',
                      fontFamily: 'Merriweather, serif',
                      fontWeight: 700,
                      fontSize: narrow ? '54px' : '68px',
                      lineHeight: 0.8,
                      color: '#e0d0ab',
                      margin: '7px 13px 0 0'
                    }}
                  >
                    {read.dropCap}
                  </span>
                  {read.body}
                </p>

                {/* WHERE THIS WAS ASKED */}
                <div
                  style={{
                    clear: 'both',
                    marginTop: '40px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(19,108,153,.45)'
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '9px',
                      letterSpacing: '.2em',
                      color: '#8fa2bd',
                      marginBottom: '14px'
                    }}
                  >
                    WHERE THIS WAS ASKED
                  </div>

                  {read.hasCite &&
                    read.citations.map((c: PyqCitation, cIdx: number) => (
                      <div
                        key={cIdx}
                        style={{
                          display: 'flex',
                          gap: '14px',
                          alignItems: 'flex-start',
                          marginBottom: '13px'
                        }}
                      >
                        <span
                          style={{
                            flex: 'none',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '.07em',
                            color: '#072e63',
                            background: '#e0d0ab',
                            padding: '4px 9px',
                            borderRadius: '2px'
                          }}
                        >
                          UPSC {c.paper} · {c.year}
                        </span>
                        <span style={{ fontSize: '12.5px', lineHeight: 1.7, color: '#9fb0c8' }}>
                          {c.note}
                        </span>
                      </div>
                    ))}

                  {read.noCite && (
                    <div style={{ fontSize: '12.5px', fontStyle: 'italic', lineHeight: 1.7, color: '#8fa2bd' }}>
                      No verified PYQ citation for this passage — carried as foundational canon, not claimed as a past question.
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    flexWrap: 'wrap',
                    marginTop: '34px'
                  }}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={read.onPin}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        read.onPin();
                      }
                    }}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '10px 16px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      border: `1px solid ${read.pinBorder}`,
                      background: read.pinBg,
                      color: read.pinColor,
                      transition: 'all .2s'
                    }}
                  >
                    {read.pinLabel}
                  </span>

                  <span
                    role="button"
                    tabIndex={0}
                    onClick={read.onCopy}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        read.onCopy();
                      }
                    }}
                    className="hover:border-[#e0d0ab] hover:text-[#e0d0ab]"
                    style={{
                      fontSize: '12px',
                      padding: '10px 16px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      border: '1px solid rgba(1,148,168,.45)',
                      color: '#c8b998',
                      transition: 'all .2s'
                    }}
                  >
                    {read.copyLabel}
                  </span>

                  <span style={{ flex: 1, minWidth: '12px' }} />

                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => stepPassage(-1)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        stepPassage(-1);
                      }
                    }}
                    className="hover:text-[#e0d0ab] hover:border-[#e0d0ab]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10.5px',
                      padding: '10px 13px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      border: '1px solid rgba(1,148,168,.45)',
                      color: '#9fb0c8',
                      transition: 'all .2s'
                    }}
                  >
                    ← PREV
                  </span>

                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => stepPassage(1)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        stepPassage(1);
                      }
                    }}
                    className="hover:text-[#e0d0ab] hover:border-[#e0d0ab]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10.5px',
                      padding: '10px 13px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      border: '1px solid rgba(1,148,168,.45)',
                      color: '#9fb0c8',
                      transition: 'all .2s'
                    }}
                  >
                    NEXT →
                  </span>
                </div>
              </article>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          THE BENCH: FIXED DRAWER & COMPARISON GRID
          ══════════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40 }}>
        {benchOpen && (
          <div
            style={{
              maxHeight: '60vh',
              overflowY: 'auto',
              background: 'rgba(3,18,42,.97)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(224,208,171,.3)',
              padding: '22px 26px 18px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '18px'
              }}
            >
              <div>
                <div style={{ fontFamily: 'Merriweather, serif', fontSize: '17px', color: '#e0d0ab' }}>
                  The Bench
                </div>
                <div style={{ fontSize: '12px', color: '#9fb0c8', marginTop: '4px', lineHeight: 1.6, maxWidth: '560px' }}>
                  {pinned.length
                    ? `${benchGroups.length} thinker${benchGroups.length === 1 ? '' : 's'} set against one theme — ${pinned.length} passage${pinned.length === 1 ? '' : 's'} collated`
                    : 'Cross-thinker collation'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={copySynthesis}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      copySynthesis();
                    }
                  }}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '9px 15px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    background: '#e0d0ab',
                    color: '#072e63'
                  }}
                >
                  {copiedSynthesis ? '✓ Copied synthesis' : 'Copy synthesis block'}
                </span>

                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setBenchOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setBenchOpen(false);
                    }
                  }}
                  style={{
                    fontSize: '12px',
                    padding: '9px 15px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    border: '1px solid rgba(1,148,168,.45)',
                    color: '#c8b998'
                  }}
                >
                  Close
                </span>
              </div>
            </div>

            {pinned.length > 0 ? (
              <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {benchGroups.map((g, gIdx) => {
                  if (!g) return null;
                  return (
                    <div
                      key={gIdx}
                      style={{
                        flex: 1,
                        minWidth: '250px',
                        borderTop: '2px solid #e0d0ab',
                        paddingTop: '13px'
                      }}
                    >
                      <div style={{ fontFamily: 'Merriweather, serif', fontSize: '14px', color: '#e0d0ab' }}>
                        {g.name}
                      </div>
                      <div
                        style={{
                          fontFamily: 'Merriweather, serif',
                          fontStyle: 'italic',
                          fontSize: '11px',
                          color: '#9fb0c8',
                          margin: '2px 0 13px'
                        }}
                      >
                        {g.work}
                      </div>
                      {g.items.map((it) => (
                        <div
                          key={it.id}
                          style={{
                            marginBottom: '11px',
                            padding: '12px',
                            background: 'rgba(7,46,99,.6)',
                            border: '1px solid rgba(1,148,168,.35)',
                            borderRadius: '2px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '9.5px',
                                letterSpacing: '.06em',
                                color: '#e0d0ab'
                              }}
                            >
                              {it.cite}
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={it.onRemove}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  it.onRemove();
                                }
                              }}
                              className="hover:text-[#e14e4e]"
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '9.5px',
                                color: '#9fb0c8',
                                cursor: 'pointer'
                              }}
                            >
                              UNPIN
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontFamily: 'Merriweather, serif',
                              fontWeight: 300,
                              fontSize: '12.5px',
                              lineHeight: 1.7,
                              color: '#d8d0bd'
                            }}
                          >
                            {it.snippet}
                          </p>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={it.onOpen}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                it.onOpen();
                              }
                            }}
                            className="hover:text-[#e0d0ab]"
                            style={{
                              display: 'inline-block',
                              marginTop: '10px',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '9.5px',
                              letterSpacing: '.08em',
                              color: '#0194a8',
                              cursor: 'pointer'
                            }}
                          >
                            OPEN IN FULL →
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '28px',
                  textAlign: 'center',
                  border: '1px dashed rgba(1,148,168,.4)',
                  borderRadius: '2px'
                }}
              >
                <div style={{ fontFamily: 'Merriweather, serif', fontSize: '14px', color: '#c8b998' }}>
                  Nothing on the bench yet.
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#9fb0c8',
                    marginTop: '7px',
                    lineHeight: 1.7,
                    maxWidth: '520px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}
                >
                  Pin passages from different thinkers and they line up here side by side — the way a strong GS-IV or essay answer sets two or three of them against one theme.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Floating Status Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
            flexWrap: 'wrap',
            padding: '11px 26px',
            background: 'rgba(2,13,32,.95)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(19,108,153,.55)'
          }}
        >
          <span
            role="button"
            tabIndex={0}
            onClick={() => setBenchOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setBenchOpen((prev) => !prev);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer' }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9.5px',
                letterSpacing: '.2em',
                color: '#e0d0ab'
              }}
            >
              BENCH
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                fontWeight: 700,
                color: '#072e63',
                background: '#e0d0ab',
                padding: '1px 7px',
                borderRadius: '2px'
              }}
            >
              {pinned.length}
            </span>
          </span>

          <span style={{ height: '15px', width: '1px', background: 'rgba(19,108,153,.6)' }} />

          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flex: 1, minWidth: 0, alignItems: 'center' }}>
            {benchChips.length > 0 ? (
              benchChips.map((ch, chIdx) => (
                <span
                  key={chIdx}
                  role="button"
                  tabIndex={0}
                  onClick={ch.onOpen}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      ch.onOpen();
                    }
                  }}
                  className="hover:text-[#e0d0ab] hover:border-[#e0d0ab]"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9.5px',
                    letterSpacing: '.05em',
                    padding: '4px 8px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    border: '1px solid rgba(224,208,171,.35)',
                    color: '#c8b998',
                    transition: 'all .2s'
                  }}
                >
                  {ch.label}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11.5px', color: '#8fa2bd' }}>
                Pin a passage to start comparing thinkers — <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>P</span> while reading
              </span>
            )}
          </div>

          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              letterSpacing: '.1em',
              color: '#8fa2bd'
            }}
          >
            {reduced ? 'REDUCED MOTION · ON' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
