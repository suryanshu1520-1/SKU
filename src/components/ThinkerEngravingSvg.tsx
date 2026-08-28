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
          <path stroke={resolvedStroke2} d="M 95 146 Q 100 152 105 146" strokeWidth="1" fill="none" />
          <circle fill={resolvedAccent} cx="100" cy="168" r="1.8" />
          <circle fill={resolvedAccent} cx="100" cy="180" r="1.8" />
          <circle fill={resolvedAccent} cx="100" cy="192" r="1.8" />
        </svg>
      )}
    </div>
  );
}
