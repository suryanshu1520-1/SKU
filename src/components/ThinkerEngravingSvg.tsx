import React from 'react';

export interface ThinkerEngravingSvgProps {
  thinkerId?: string;
  who?: string;
  isHovered?: boolean;
  isSelected?: boolean;
  stroke?: string;
  stroke2?: string;
  accent?: string;
  head?: string;
  lensFill?: string;
  guideOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ThinkerEngravingSvg({
  thinkerId,
  who,
  isHovered = false,
  isSelected = false,
  stroke,
  stroke2,
  accent,
  head,
  lensFill,
  guideOpacity,
  className = 'w-full h-full',
  style,
}: ThinkerEngravingSvgProps) {
  const id = who || thinkerId || 'ambedkar';
  const active = isHovered || isSelected;

  const resolvedStroke = stroke || (active ? '#e0d0ab' : '#0194a8');
  const resolvedStroke2 = stroke2 || (active ? '#c8b998' : '#136c99');
  const resolvedAccent = accent || (active ? '#e0d0ab' : '#0194a8');
  const resolvedHead = head || (active ? '#072e63' : '#072e63');
  const resolvedLensFill = lensFill || (active ? 'rgba(224,208,171,.1)' : 'none');
  const resolvedGuideOpacity = guideOpacity ?? (active ? 0.26 : 0.12);

  return (
    <div className={`relative flex items-center justify-center select-none overflow-hidden ${className}`} style={style}>
      {/* ─────────────────────────────────────────────────────────────
          1. DR. B. R. AMBEDKAR — Constitutional Architect
      ───────────────────────────────────────────────────────────── */}
      {id === 'ambedkar' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.75" strokeDasharray="2 3" fill="none">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="78" />
            <circle cx="100" cy="100" r="64" />
            <line x1="100" y1="8" x2="100" y2="192" />
            <line x1="8" y1="100" x2="192" y2="100" />
            <line x1="35" y1="35" x2="165" y2="165" />
            <line x1="35" y1="165" x2="165" y2="35" />
          </g>
          <path stroke={resolvedStroke2} d="M 60 155 Q 100 145 140 155 L 140 185 Q 100 175 60 185 Z" fill="none" strokeWidth="1" opacity={0.3} />
          <line stroke={resolvedStroke2} x1="100" y1="145" x2="100" y2="185" strokeWidth="1" opacity={0.3} />
          <path stroke={resolvedStroke} d="M 64 88 C 62 62 72 44 100 44 C 128 44 138 62 136 88 C 135 110 124 132 100 134 C 76 132 65 110 64 88 Z" strokeWidth="1.75" fill={resolvedHead} />
          <g stroke={resolvedStroke2} strokeWidth="1" strokeLinecap="round" fill="none">
            <path d="M 68 62 Q 95 48 126 56" />
            <path d="M 70 54 Q 98 42 120 48" />
            <path d="M 72 46 Q 96 38 114 42" />
            <path d="M 65 72 C 70 65 80 62 90 60" />
            <path d="M 64 80 C 66 74 72 70 80 68" />
          </g>
          <path stroke={resolvedStroke} d="M 78 78 Q 88 74 96 76" strokeWidth="1.25" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 104 76 Q 112 74 122 78" strokeWidth="1.25" strokeLinecap="round" fill="none" />
          <g stroke={resolvedStroke} strokeWidth="1.75" fill={resolvedLensFill}>
            <circle cx="86" cy="88" r="11" />
            <circle cx="114" cy="88" r="11" />
          </g>
          <g stroke={resolvedStroke} fill="none">
            <path d="M 97 86 Q 100 84 103 86" strokeWidth="2" strokeLinecap="round" />
            <path d="M 75 88 L 65 84" strokeWidth="1.2" />
            <path d="M 125 88 L 135 84" strokeWidth="1.2" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="88" r="2.2" />
          <circle fill={resolvedAccent} cx="114" cy="88" r="2.2" />
          <path stroke={resolvedStroke} d="M 100 87 L 100 102 L 96 104" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path stroke={resolvedStroke} d="M 88 114 Q 100 118 112 114" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke2} d="M 94 122 Q 100 124 106 122" strokeWidth="1" strokeLinecap="round" fill="none" />
          <g stroke={resolvedStroke} strokeWidth="1.5" fill="none">
            <path d="M 85 134 L 100 148 L 115 134" />
            <path d="M 93 140 L 93 158 L 100 166 L 107 158 L 107 140" />
            <path d="M 72 136 L 40 175 L 40 195 L 160 195 L 160 175 L 128 136" />
            <path d="M 72 136 L 85 178 L 100 185 L 115 178 L 128 136" />
          </g>
          <polygon fill={resolvedAccent} points="96,140 104,140 102,148 98,148" />
          <line stroke={resolvedStroke2} x1="56" y1="165" x2="78" y2="185" strokeWidth="1" />
          <line stroke={resolvedStroke2} x1="144" y1="165" x2="122" y2="185" strokeWidth="1" />
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. MAHATMA GANDHI — Moral Swaraj & Soul-Force
      ───────────────────────────────────────────────────────────── */}
      {id === 'gandhi' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="90" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="82" />
            <circle cx="100" cy="100" r="24" />
            <line x1="124" y1="100" x2="182" y2="100" />
            <line x1="120.8" y1="112" x2="171" y2="141" />
            <line x1="112" y1="120.8" x2="141" y2="171" />
            <line x1="100" y1="124" x2="100" y2="182" />
            <line x1="88" y1="120.8" x2="59" y2="171" />
            <line x1="79.2" y1="112" x2="29" y2="141" />
            <line x1="76" y1="100" x2="18" y2="100" />
            <line x1="79.2" y1="88" x2="29" y2="59" />
            <line x1="88" y1="79.2" x2="59" y2="29" />
            <line x1="100" y1="76" x2="100" y2="18" />
            <line x1="112" y1="79.2" x2="141" y2="29" />
            <line x1="120.8" y1="88" x2="171" y2="59" />
          </g>
          <path stroke={resolvedStroke} d="M 68 94 C 64 60 74 44 100 44 C 126 44 136 60 132 94 C 130 114 120 132 100 134 C 80 132 70 114 68 94 Z" strokeWidth="1.75" fill={resolvedHead} />
          <g stroke={resolvedStroke2} strokeWidth="1" strokeLinecap="round" fill="none">
            <path d="M 82 58 Q 100 52 118 58" />
            <path d="M 85 66 Q 100 60 115 66" />
          </g>
          <path stroke={resolvedStroke} d="M 78 78 Q 87 72 95 78" strokeWidth="1.25" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 105 78 Q 113 72 122 78" strokeWidth="1.25" strokeLinecap="round" fill="none" />
          <g stroke={resolvedStroke} strokeWidth="1.75" fill={resolvedLensFill}>
            <circle cx="86" cy="88" r="11.5" />
            <circle cx="114" cy="88" r="11.5" />
          </g>
          <g stroke={resolvedStroke} fill="none">
            <path d="M 97.5 87 Q 100 85 102.5 87" strokeWidth="2" strokeLinecap="round" />
            <path d="M 74.5 88 L 65 85" strokeWidth="1.2" />
            <path d="M 125.5 88 L 135 85" strokeWidth="1.2" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="88" r="2.2" />
          <circle fill={resolvedAccent} cx="114" cy="88" r="2.2" />
          <path stroke={resolvedStroke} d="M 100 87 L 99 104 L 95 106" strokeWidth="1.25" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 86 112 C 92 110 97 114 100 112 C 103 114 108 110 114 112" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 88 118 Q 100 124 112 118" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 68 84 C 60 84 58 100 68 108" strokeWidth="1.4" fill="none" />
          <path stroke={resolvedStroke} d="M 132 84 C 140 84 142 100 132 108" strokeWidth="1.4" fill="none" />
          <path stroke={resolvedStroke} d="M 50 160 Q 85 140 120 148 L 155 170 L 155 195 L 45 195 L 45 170 Z" strokeWidth="1.5" fill="none" />
          <g stroke={resolvedStroke2} strokeWidth="1.2" fill="none">
            <path d="M 86 132 L 86 142" />
            <path d="M 114 132 L 114 142" />
            <path d="M 60 170 Q 95 155 135 168" />
            <path d="M 50 182 Q 90 170 145 182" />
            <path d="M 80 145 L 65 195" strokeDasharray="3 2" />
          </g>
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. IMMANUEL KANT — Deontological Ethics & Reason
      ───────────────────────────────────────────────────────────── */}
      {id === 'kant' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <ellipse cx="100" cy="100" rx="90" ry="38" transform="rotate(-25 100 100)" strokeDasharray="4 3" />
            <ellipse cx="100" cy="100" rx="90" ry="38" transform="rotate(35 100 100)" strokeDasharray="4 3" />
            <circle cx="100" cy="100" r="92" />
            <line x1="100" y1="5" x2="100" y2="15" strokeWidth="1.5" />
            <line x1="100" y1="185" x2="100" y2="195" strokeWidth="1.5" />
            <line x1="5" y1="100" x2="15" y2="100" strokeWidth="1.5" />
            <line x1="185" y1="100" x2="195" y2="100" strokeWidth="1.5" />
          </g>
          <path stroke={resolvedStroke} d="M 60 92 C 52 50 68 38 100 38 C 132 38 148 50 140 92 C 146 104 142 118 132 124 C 122 130 116 134 100 134 C 84 134 78 130 68 124 C 58 118 54 104 60 92 Z" strokeWidth="1.75" fill={resolvedHead} />
          <g stroke={resolvedStroke2} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path d="M 75 48 C 88 40 112 40 125 48" />
            <path d="M 72 58 C 86 50 114 50 128 58" />
            <path d="M 58 72 C 52 78 54 86 60 90" />
            <path d="M 56 86 C 50 92 52 100 58 104" />
            <path d="M 54 100 C 48 106 50 114 58 118" />
            <path d="M 142 72 C 148 78 146 86 140 90" />
            <path d="M 144 86 C 150 92 148 100 142 104" />
            <path d="M 146 100 C 152 106 150 114 142 118" />
          </g>
          <g stroke={resolvedStroke} strokeWidth="1.3" strokeLinecap="round" fill="none">
            <path d="M 78 74 Q 88 68 96 72" />
            <path d="M 104 72 Q 112 68 122 74" />
            <path d="M 80 80 Q 86 77 92 80" strokeWidth="1.2" />
            <path d="M 108 80 Q 114 77 120 80" strokeWidth="1.2" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="82" r="2.4" />
          <circle fill={resolvedAccent} cx="114" cy="82" r="2.4" />
          <path stroke={resolvedStroke} d="M 100 78 L 100 98 L 95 101" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 89 110 Q 100 112 111 110" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke2} d="M 94 118 Q 100 120 106 118" strokeWidth="1" strokeLinecap="round" fill="none" />
          <g stroke={resolvedStroke} strokeWidth="1.5" fill="none">
            <path d="M 88 132 Q 100 140 112 132" />
            <path d="M 92 136 C 88 145 94 154 100 156 C 106 154 112 145 108 136" />
            <path d="M 72 138 L 44 175 L 44 195 L 156 195 L 156 175 L 128 138" />
            <path d="M 72 138 L 84 185 L 100 195 L 116 185 L 128 138" />
          </g>
          <circle fill={resolvedAccent} cx="100" cy="168" r="1.8" />
          <circle fill={resolvedAccent} cx="100" cy="180" r="1.8" />
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. JOHN STUART MILL — On Liberty & Free Thought
      ───────────────────────────────────────────────────────────── */}
      {id === 'mill' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="92" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="76" />
            <line x1="100" y1="8" x2="100" y2="192" />
            <line x1="8" y1="100" x2="192" y2="100" />
            <polygon points="100,16 173,142 27,142" strokeWidth="0.6" opacity={0.4} />
          </g>
          {/* Head & Victorian High Forehead Contour */}
          <path
            stroke={resolvedStroke}
            d="M 66 90 C 60 55 72 38 100 38 C 128 38 140 55 134 90 C 132 112 122 130 100 134 C 78 130 68 112 66 90 Z"
            strokeWidth="1.75"
            fill={resolvedHead}
          />
          {/* Victorian Mutton-Chop Sideburns & Thinning Hair */}
          <g stroke={resolvedStroke2} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path d="M 76 46 Q 100 40 124 46" />
            <path d="M 64 68 C 60 76 58 92 64 108 C 68 118 72 122 78 126" />
            <path d="M 136 68 C 140 76 142 92 136 108 C 132 118 128 122 122 126" />
            <path d="M 62 82 C 66 90 68 102 74 112" />
            <path d="M 138 82 C 134 90 132 102 126 112" />
          </g>
          {/* Eyebrows & Eyes */}
          <g stroke={resolvedStroke} strokeWidth="1.25" strokeLinecap="round" fill="none">
            <path d="M 76 74 Q 86 68 95 72" />
            <path d="M 105 72 Q 114 68 124 74" />
            <path d="M 78 80 Q 86 76 94 80" strokeWidth="1" />
            <path d="M 106 80 Q 114 76 122 80" strokeWidth="1" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="80" r="2.2" />
          <circle fill={resolvedAccent} cx="114" cy="80" r="2.2" />
          {/* Straight Nose & Firm Mouth */}
          <path stroke={resolvedStroke} d="M 100 76 L 100 98 L 95 101" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 88 112 Q 100 115 112 112" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke2} d="M 94 120 Q 100 122 106 120" strokeWidth="1" strokeLinecap="round" fill="none" />
          {/* High Winged Collar, Silk Cravat & Coat */}
          <g stroke={resolvedStroke} strokeWidth="1.5" fill="none">
            <path d="M 80 134 L 100 152 L 120 134" />
            <path d="M 84 134 L 92 168 L 100 178 L 108 168 L 116 134" />
            <path d="M 68 136 L 38 175 L 38 195 L 162 195 L 162 175 L 132 136" />
          </g>
          <circle fill={resolvedAccent} cx="100" cy="158" r="2" />
          <circle fill={resolvedAccent} cx="100" cy="184" r="2" />
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. KAUTILYA (CHANAKYA) — Rajadharma & Statecraft
      ───────────────────────────────────────────────────────────── */}
      {id === 'kautilya' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="90" />
            <circle cx="100" cy="100" r="74" strokeDasharray="3 3" />
            <line x1="100" y1="10" x2="100" y2="190" />
            <line x1="10" y1="100" x2="190" y2="100" />
          </g>
          {/* Ascetic Scholar Shikha (Topknot Tuft behind Head) */}
          <path
            stroke={resolvedStroke}
            fill={resolvedHead}
            strokeWidth="1.5"
            d="M 126 50 C 145 36 160 48 152 68 C 146 78 136 76 130 68 Z"
          />
          <path stroke={resolvedStroke2} d="M 134 54 Q 148 46 144 64" strokeWidth="1" fill="none" />
          {/* Shaved Head & Dignified Cranial Profile */}
          <path
            stroke={resolvedStroke}
            d="M 68 90 C 64 54 74 38 100 38 C 126 38 134 54 132 90 C 130 114 122 132 100 134 C 78 132 70 114 68 90 Z"
            strokeWidth="1.75"
            fill={resolvedHead}
          />
          {/* Sacred Tripundra / Tilak on Forehead */}
          <g stroke={resolvedStroke2} strokeWidth="1" fill="none">
            <path d="M 88 56 Q 100 54 112 56" />
            <path d="M 90 60 Q 100 58 110 60" />
          </g>
          <circle fill={resolvedAccent} cx="100" cy="66" r="2.5" />
          {/* Piercing Eyes & Intellectual Brow */}
          <g stroke={resolvedStroke} strokeWidth="1.3" strokeLinecap="round" fill="none">
            <path d="M 76 76 Q 86 70 96 74" />
            <path d="M 104 74 Q 114 70 124 76" />
            <path d="M 78 82 Q 86 78 94 82" />
            <path d="M 106 82 Q 114 78 122 82" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="82" r="2.3" />
          <circle fill={resolvedAccent} cx="114" cy="82" r="2.3" />
          {/* Sharp Aquiline Nose & Firm Statesman Lips */}
          <path stroke={resolvedStroke} d="M 100 78 L 100 99 L 94 102" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 86 114 Q 100 116 114 114" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke2} d="M 92 122 Q 100 124 108 122" strokeWidth="1" fill="none" />
          {/* Vedic Uttariya (Draped Shawl) & Yajnopavita Thread */}
          <g stroke={resolvedStroke} strokeWidth="1.5" fill="none">
            <path d="M 74 136 Q 100 144 126 136" />
            <path d="M 50 155 Q 85 140 120 152 L 155 175 L 155 195 L 45 195 L 45 175 Z" />
            {/* Sacred Diagonal Thread */}
            <line stroke={resolvedAccent} x1="72" y1="138" x2="135" y2="195" strokeWidth="1.3" strokeDasharray="4 2" />
          </g>
          <path stroke={resolvedStroke2} d="M 60 168 Q 95 155 135 170" strokeWidth="1.2" fill="none" />
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. ARISTOTLE — Virtue Ethics & The Golden Mean
      ───────────────────────────────────────────────────────────── */}
      {id === 'aristotle' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="92" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="76" />
            <ellipse cx="100" cy="100" rx="90" ry="45" />
          </g>
          {/* Classical Greek Head & Beard Silhouette */}
          <path
            stroke={resolvedStroke}
            d="M 64 85 C 58 48 70 38 100 38 C 130 38 142 48 136 85 C 142 108 135 136 100 138 C 65 136 58 108 64 85 Z"
            strokeWidth="1.75"
            fill={resolvedHead}
          />
          {/* Hellenic Curly Hair Folds */}
          <g stroke={resolvedStroke2} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path d="M 72 48 C 84 40 116 40 128 48" />
            <path d="M 66 60 C 78 52 122 52 134 60" />
            <path d="M 60 74 C 66 68 74 66 82 66" />
            <path d="M 140 74 C 134 68 126 66 118 66" />
          </g>
          {/* Classical Brow & Meditative Eyes */}
          <g stroke={resolvedStroke} strokeWidth="1.3" strokeLinecap="round" fill="none">
            <path d="M 76 74 Q 86 70 95 73" />
            <path d="M 105 73 Q 114 70 124 74" />
            <path d="M 78 80 Q 86 76 94 80" />
            <path d="M 106 80 Q 114 76 122 80" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="80" r="2.2" />
          <circle fill={resolvedAccent} cx="114" cy="80" r="2.2" />
          {/* Straight Hellenic Nose Bridge */}
          <path stroke={resolvedStroke} d="M 100 74 L 100 96 L 94 99" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          {/* Magnificent Full Greek Beard & Mustache */}
          <path
            stroke={resolvedStroke}
            fill={resolvedHead}
            strokeWidth="1.4"
            d="M 82 104 C 92 100 98 106 100 106 C 102 106 108 100 118 104 C 126 116 124 134 100 136 C 76 134 74 116 82 104 Z"
          />
          <g stroke={resolvedStroke2} strokeWidth="1.1" strokeLinecap="round" fill="none">
            <path d="M 88 112 Q 100 124 112 112" />
            <path d="M 84 122 Q 100 134 116 122" />
            <path d="M 92 128 Q 100 136 108 128" />
          </g>
          {/* Classical Himation (Draped Greek Toga) */}
          <g stroke={resolvedStroke} strokeWidth="1.5" fill="none">
            <path d="M 46 160 Q 80 142 120 148 L 158 172 L 158 195 L 42 195 L 42 172 Z" />
            <path d="M 60 170 Q 95 152 140 168" />
            <path d="M 52 182 Q 95 168 150 182" />
          </g>
          <circle fill={resolvedAccent} cx="100" cy="154" r="2" />
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. JOHN RAWLS — Justice as Fairness & The Veil
      ───────────────────────────────────────────────────────────── */}
      {id === 'rawls' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="92" strokeDasharray="3 3" />
            <polygon points="100,20 170,145 30,145" strokeWidth="0.7" />
            <line x1="30" y1="100" x2="170" y2="100" strokeWidth="1.2" strokeDasharray="4 2" />
          </g>
          {/* Mid-Century Academic Head Shape */}
          <path
            stroke={resolvedStroke}
            d="M 66 88 C 62 56 72 40 100 40 C 128 40 138 56 134 88 C 132 112 124 132 100 134 C 76 132 68 112 66 88 Z"
            strokeWidth="1.75"
            fill={resolvedHead}
          />
          {/* Neat Side-Combed Academic Hair */}
          <g stroke={resolvedStroke2} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path d="M 68 56 Q 96 46 128 54" />
            <path d="M 72 48 Q 98 42 120 48" />
            <path d="M 64 70 C 68 64 78 62 88 62" />
          </g>
          {/* Eyebrows */}
          <path stroke={resolvedStroke} d="M 76 74 Q 86 70 94 72" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 106 72 Q 114 70 124 74" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          {/* Academic Horn-Rimmed Glasses */}
          <g stroke={resolvedStroke} strokeWidth="1.75" fill={resolvedLensFill}>
            <rect x="74" y="76" width="22" height="18" rx="3" />
            <rect x="104" y="76" width="22" height="18" rx="3" />
          </g>
          <line stroke={resolvedStroke} x1="96" y1="84" x2="104" y2="84" strokeWidth="2" />
          <line stroke={resolvedStroke} x1="74" y1="83" x2="66" y2="80" strokeWidth="1.2" />
          <line stroke={resolvedStroke} x1="126" y1="83" x2="134" y2="80" strokeWidth="1.2" />
          {/* Eyes with Accent Pupils */}
          <circle fill={resolvedAccent} cx="85" cy="85" r="2.2" />
          <circle fill={resolvedAccent} cx="115" cy="85" r="2.2" />
          {/* Nose & Gentle Scholarly Smile */}
          <path stroke={resolvedStroke} d="M 100 84 L 100 102 L 95 105" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 88 114 Q 100 118 112 114" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke2} d="M 94 122 Q 100 124 106 122" strokeWidth="1" fill="none" />
          {/* Ivy League Tweed Jacket, Shirt Collar & Tie */}
          <g stroke={resolvedStroke} strokeWidth="1.5" fill="none">
            <path d="M 82 134 L 100 150 L 118 134" />
            <path d="M 92 142 L 94 172 L 100 180 L 106 172 L 108 142" />
            <path d="M 68 136 L 38 175 L 38 195 L 162 195 L 162 175 L 132 136" />
          </g>
          <polygon fill={resolvedAccent} points="96,142 104,142 102,150 98,150" />
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. SWAMI VIVEKANANDA — Karma Yoga & Fearless Service
      ───────────────────────────────────────────────────────────── */}
      {id === 'vivekananda' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="76" strokeDasharray="3 3" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={100 + 88 * Math.cos((i * Math.PI) / 4)}
                y2={100 + 88 * Math.sin((i * Math.PI) / 4)}
                strokeDasharray="2 3"
              />
            ))}
          </g>
          {/* Iconic Saffron Monk's Turban (Pagri) */}
          <path
            stroke={resolvedStroke}
            fill={resolvedHead}
            strokeWidth="1.75"
            d="M 58 64 C 54 36 78 26 100 26 C 122 26 146 36 142 64 C 144 74 138 78 130 80 C 100 74 100 74 70 80 C 62 78 56 74 58 64 Z"
          />
          {/* Turban Folds & Crest */}
          <g stroke={resolvedStroke2} strokeWidth="1.3" strokeLinecap="round" fill="none">
            <path d="M 64 56 Q 100 42 136 56" />
            <path d="M 68 46 Q 100 34 132 46" />
            <path d="M 60 68 Q 100 58 140 68" />
            <path d="M 94 28 C 96 22 104 22 106 28" strokeWidth="1.5" stroke={resolvedAccent} />
          </g>
          {/* Broad Radiant Face Contour */}
          <path
            stroke={resolvedStroke}
            d="M 68 80 C 66 96 68 114 76 124 C 84 134 116 134 124 124 C 132 114 134 96 132 80"
            strokeWidth="1.75"
            fill={resolvedHead}
          />
          {/* Majestic Almond Eyes & Serene Brow */}
          <g stroke={resolvedStroke} strokeWidth="1.3" strokeLinecap="round" fill="none">
            <path d="M 76 82 Q 86 76 96 80" />
            <path d="M 104 80 Q 114 76 124 82" />
            <path d="M 76 88 Q 86 84 96 88" strokeWidth="1.4" />
            <path d="M 104 88 Q 114 84 124 88" strokeWidth="1.4" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="87" r="2.5" />
          <circle fill={resolvedAccent} cx="114" cy="87" r="2.5" />
          {/* Regal Nose & Firm Compassionate Lips */}
          <path stroke={resolvedStroke} d="M 100 82 L 100 103 L 94 106" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 86 116 Q 100 120 114 116" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke2} d="M 92 124 Q 100 126 108 124" strokeWidth="1.1" fill="none" />
          {/* Draped Monk's Gerua Shawl Across Chest */}
          <g stroke={resolvedStroke} strokeWidth="1.6" fill="none">
            <path d="M 44 158 Q 85 138 125 146 L 158 170 L 158 195 L 42 195 L 42 170 Z" />
            <path d="M 55 170 Q 95 152 145 166" />
            <path d="M 48 182 Q 95 166 150 180" />
          </g>
          <circle fill={resolvedAccent} cx="100" cy="150" r="2.2" />
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. RABINDRANATH TAGORE — Universal Humanism
      ───────────────────────────────────────────────────────────── */}
      {id === 'tagore' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="92" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="76" />
            <path d="M 20 100 Q 100 35 180 100 Q 100 165 20 100 Z" />
          </g>
          {/* Head & Long Flowing Hair Silhouette */}
          <path
            stroke={resolvedStroke}
            d="M 60 85 C 54 48 68 36 100 36 C 132 36 146 48 140 85 C 146 116 138 145 100 148 C 62 145 54 116 60 85 Z"
            strokeWidth="1.75"
            fill={resolvedHead}
          />
          {/* Flowing Silver Locks Framing Head */}
          <g stroke={resolvedStroke2} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path d="M 72 46 Q 100 38 128 46" />
            <path d="M 64 58 C 58 72 54 94 58 116" />
            <path d="M 136 58 C 142 72 146 94 142 116" />
            <path d="M 68 70 C 62 88 60 108 66 128" />
            <path d="M 132 70 C 138 88 140 108 134 128" />
          </g>
          {/* Deep Soulful Poetic Eyes & High Forehead */}
          <g stroke={resolvedStroke} strokeWidth="1.25" strokeLinecap="round" fill="none">
            <path d="M 76 74 Q 86 68 95 72" />
            <path d="M 105 72 Q 114 68 124 74" />
            <path d="M 78 80 Q 86 76 94 80" />
            <path d="M 106 80 Q 114 76 122 80" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="80" r="2.2" />
          <circle fill={resolvedAccent} cx="114" cy="80" r="2.2" />
          {/* Long Aquiline Nose */}
          <path stroke={resolvedStroke} d="M 100 74 L 100 98 L 94 101" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          {/* Flowing Majestic Long Beard & Mustache */}
          <path
            stroke={resolvedStroke}
            fill={resolvedHead}
            strokeWidth="1.5"
            d="M 80 106 C 90 102 96 108 100 108 C 104 108 110 102 120 106 C 130 120 128 155 100 162 C 72 155 70 120 80 106 Z"
          />
          <g stroke={resolvedStroke2} strokeWidth="1.1" strokeLinecap="round" fill="none">
            <path d="M 86 116 Q 100 132 114 116" />
            <path d="M 84 128 Q 100 144 116 128" />
            <path d="M 90 140 Q 100 152 110 140" />
          </g>
          {/* Traditional Bengali Jobba / Long Robe */}
          <g stroke={resolvedStroke} strokeWidth="1.5" fill="none">
            <path d="M 50 165 L 40 178 L 40 195 L 160 195 L 160 178 L 150 165" />
            <path d="M 68 175 L 85 195" strokeDasharray="3 2" />
            <path d="M 132 175 L 115 195" strokeDasharray="3 2" />
          </g>
          <circle fill={resolvedAccent} cx="100" cy="176" r="2" />
          <circle fill={resolvedAccent} cx="100" cy="188" r="2" />
        </svg>
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. JEAN-JACQUES ROUSSEAU — The General Will
      ───────────────────────────────────────────────────────────── */}
      {id === 'rousseau' && (
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full block">
          <g stroke={resolvedStroke} opacity={resolvedGuideOpacity} strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="76" strokeDasharray="4 2" />
            <ellipse cx="100" cy="100" rx="90" ry="40" transform="rotate(-30 100 100)" />
          </g>
          {/* Enlightenment Powdered Wig & Head Profile */}
          <path
            stroke={resolvedStroke}
            d="M 62 88 C 56 52 68 38 100 38 C 132 38 144 52 138 88 C 142 108 134 130 100 134 C 66 130 58 108 62 88 Z"
            strokeWidth="1.75"
            fill={resolvedHead}
          />
          {/* Enlightenment Side Curls & Back Queue Ribbon */}
          <g stroke={resolvedStroke2} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path d="M 74 48 C 86 40 114 40 126 48" />
            <path d="M 58 68 C 52 74 54 84 60 88" />
            <path d="M 56 82 C 50 88 52 96 58 100" />
            <path d="M 142 68 C 148 74 146 84 140 88" />
            <path d="M 144 82 C 150 88 148 96 142 100" />
          </g>
          {/* Arched Brows & Passionate Sensitive Eyes */}
          <g stroke={resolvedStroke} strokeWidth="1.25" strokeLinecap="round" fill="none">
            <path d="M 76 74 Q 86 68 96 72" />
            <path d="M 104 72 Q 114 68 124 74" />
            <path d="M 78 80 Q 86 76 94 80" />
            <path d="M 106 80 Q 114 76 122 80" />
          </g>
          <circle fill={resolvedAccent} cx="86" cy="80" r="2.3" />
          <circle fill={resolvedAccent} cx="114" cy="80" r="2.3" />
          {/* Straight Nose & Expressive Natural Lips */}
          <path stroke={resolvedStroke} d="M 100 74 L 100 98 L 94 101" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke} d="M 88 112 Q 100 116 112 112" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path stroke={resolvedStroke2} d="M 94 120 Q 100 122 106 120" strokeWidth="1" fill="none" />
          {/* Enlightenment Frock Coat & Ruffled Linen Jabot */}
          <g stroke={resolvedStroke} strokeWidth="1.5" fill="none">
            <path d="M 84 134 Q 100 144 116 134" />
            <path d="M 90 138 C 86 148 94 156 100 158 C 106 156 114 148 110 138" />
            <path d="M 70 136 L 42 175 L 42 195 L 158 195 L 158 175 L 130 136" />
          </g>
          <path stroke={resolvedStroke2} d="M 94 146 Q 100 150 106 146" strokeWidth="1" fill="none" />
          <circle fill={resolvedAccent} cx="100" cy="170" r="1.8" />
          <circle fill={resolvedAccent} cx="100" cy="184" r="1.8" />
        </svg>
      )}
    </div>
  );
}
