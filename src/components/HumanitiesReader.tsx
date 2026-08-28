import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

const PAPERS = ['GS-I', 'GS-IV'];
const YEARS = [2023, 2022, 2021, 2020, 2019, 2015];

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
    <div className="relative min-h-screen bg-[#041d40] text-stone-200 font-sans pb-28 overflow-x-hidden selection:bg-[#e0d0ab] selection:text-[#072e63]"
         style={{ background: 'radial-gradient(120% 78% at 50% 0%, #0b3d78 0%, #072e63 40%, #041d40 100%)' }}>

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

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(115% 80% at 50% 32%, rgba(4,29,64,0) 36%, rgba(3,16,38,.78) 100%)' }}
      />

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

          {/* ── Band of Thinkers (Steles) ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: narrow ? 'column' : 'row',
              gap: narrow ? '10px' : '3px',
              alignItems: 'stretch'
            }}
          >
            {thinkers.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                aria-label={t.aria}
                onMouseEnter={t.onAttend}
                onFocus={t.onAttend}
                onClick={t.onAttendOrOpen}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    t.onAttendOrOpen();
                  }
                }}
                style={{
                  position: 'relative',
                  flex: t.flex,
                  minHeight: t.minH,
                  padding: t.pad,
                  cursor: 'pointer',
                  outline: 'none',
                  overflow: 'hidden',
                  border: `1px solid ${t.border}`,
                  background: t.bg,
                  boxShadow: t.shadow,
                  opacity: t.opacity,
                  transition: 'flex .5s cubic-bezier(.4,0,.2,1), background .4s, border-color .3s, opacity .3s',
                  display: 'flex',
                  flexDirection: t.innerDir,
                  alignItems: t.innerAlign,
                  gap: t.innerGap
                }}
              >
                {/* Top Corner Metadata */}
                <span
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '12px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    letterSpacing: '.16em',
                    color: t.metaColor
                  }}
                >
                  {t.era}
                </span>
                <span
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '12px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    letterSpacing: '.1em',
                    color: t.metaColor
                  }}
                >
                  {t.citeCount}
                </span>

                {/* SVG Portrait Engraving */}
                <div
                  style={{
                    flex: 'none',
                    width: t.portraitPx,
                    height: t.portraitPx,
                    transition: 'width .5s cubic-bezier(.4,0,.2,1), height .5s cubic-bezier(.4,0,.2,1)',
                    filter: t.portraitGlow
                  }}
                >
                  <ThinkerEngravingSvg
                    who={t.id}
                    stroke={t.stroke}
                    stroke2={t.stroke2}
                    accent={t.accent}
                    lensFill={t.lensFill}
                    guideOpacity={t.guideOpacity}
                    className="w-full h-full"
                  />
                </div>

                {/* Thinker Name, Work & Active Voice Block */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: t.textAlign,
                    textAlign: t.textAlignCss,
                    gap: '5px',
                    width: '100%',
                    minWidth: 0
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'Merriweather, serif',
                      fontWeight: 400,
                      fontSize: t.nameSize,
                      color: t.nameColor,
                      lineHeight: 1.15,
                      transition: 'color .3s, font-size .4s'
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Merriweather, serif',
                      fontStyle: 'italic',
                      fontSize: '11.5px',
                      color: t.workColor
                    }}
                  >
                    {t.work} · {t.workYear}
                  </div>

                  {/* Attended / Active Voice Dossier */}
                  {t.isActive && (
                    <div style={{ width: '100%', maxWidth: '520px', marginTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                        <span
                          style={{
                            flex: 'none',
                            fontFamily: 'Merriweather, serif',
                            fontSize: '34px',
                            lineHeight: 0.7,
                            color: 'rgba(224,208,171,.45)'
                          }}
                        >
                          “
                        </span>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: 'Merriweather, serif',
                            fontWeight: 300,
                            fontSize: t.voiceSize,
                            lineHeight: 1.62,
                            color: '#e8e0cf'
                          }}
                        >
                          {t.typed}
                          <span
                            style={{
                              display: t.caretDisplay,
                              width: '2px',
                              height: '.95em',
                              backgroundColor: '#e0d0ab',
                              verticalAlign: 'text-bottom',
                              marginLeft: '3px',
                              animation: 'caret 1s step-end infinite'
                            }}
                          />
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '11px',
                          marginTop: '16px',
                          opacity: t.stampOpacity,
                          transition: 'opacity .5s'
                        }}
                      >
                        <span
                          style={{
                            height: '1px',
                            width: '38px',
                            background: 'linear-gradient(90deg, rgba(224,208,171,0), #e0d0ab)',
                            transformOrigin: 'left',
                            animation: t.leaderAnim
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '10.5px',
                            fontWeight: 700,
                            letterSpacing: '.09em',
                            color: '#072e63',
                            background: '#e0d0ab',
                            padding: '3px 8px',
                            borderRadius: '2px'
                          }}
                        >
                          {t.stamp}
                        </span>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '9.5px',
                            letterSpacing: '.1em',
                            color: '#9fb0c8'
                          }}
                        >
                          drawn from this passage
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          marginTop: '20px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '9px',
                            letterSpacing: '.16em',
                            color: '#8fa2bd'
                          }}
                        >
                          READ IN FULL
                        </span>
                        {t.ticks.map((k) => (
                          <span
                            key={k.id}
                            role="button"
                            tabIndex={0}
                            onClick={k.onClick}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                k.onClick(e as any);
                              }
                            }}
                            className="hover:border-[#e0d0ab] hover:text-[#e0d0ab]"
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '10.5px',
                              padding: '4px 9px',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              border: `1px solid ${k.border}`,
                              background: k.bg,
                              color: k.color,
                              transition: 'all .2s'
                            }}
                          >
                            {k.label}
                          </span>
                        ))}
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '9.5px',
                            color: '#8fa2bd'
                          }}
                        >
                          ↵
                        </span>
                      </div>
                    </div>
                  )}

                  {t.isDim && (
                    <div
                      style={{
                        marginTop: '5px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9.5px',
                        letterSpacing: '.1em',
                        color: '#8fa2bd'
                      }}
                    >
                      {t.dimHint}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
