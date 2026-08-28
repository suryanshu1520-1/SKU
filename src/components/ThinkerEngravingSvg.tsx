import React from 'react';

interface ThinkerEngravingSvgProps {
  thinkerId: string;
  isHovered: boolean;
  isSelected: boolean;
  className?: string;
}

export default function ThinkerEngravingSvg({
  thinkerId,
  isHovered,
  isSelected,
  className = 'w-full h-full',
}: ThinkerEngravingSvgProps) {
  const active = isHovered || isSelected;
  const strokeColor = active ? '#e0d0ab' : '#0194a8';
  const glowOpacity = active ? 0.35 : 0.08;
  const secondaryColor = active ? '#c8b998' : '#136c99';

  return (
    <div className={`relative flex items-center justify-center select-none overflow-hidden ${className}`}>
      {thinkerId === 'ambedkar' && (
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full transition-transform duration-500 ease-out"
          style={{ transform: active ? 'scale(1.04)' : 'scale(1)' }}
        >
          {/* Background Radial Engraving Lines */}
          <g opacity={active ? 0.25 : 0.12} stroke={strokeColor} strokeWidth="0.75" strokeDasharray="2 3">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="78" />
            <circle cx="100" cy="100" r="64" />
            <line x1="100" y1="8" x2="100" y2="192" />
            <line x1="8" y1="100" x2="192" y2="100" />
            <line x1="35" y1="35" x2="165" y2="165" />
            <line x1="35" y1="165" x2="165" y2="35" />
          </g>

          {/* Constitution Folio Watermark Aura */}
          <path
            d="M 60 155 Q 100 145 140 155 L 140 185 Q 100 175 60 185 Z"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1"
            opacity={active ? 0.4 : 0.15}
          />
          <line x1="100" y1="145" x2="100" y2="185" stroke={secondaryColor} strokeWidth="1" opacity={0.3} />

          {/* Head & Hair Contour - Crisp Side-Parted Style */}
          <path
            d="M 64 88 C 62 62 72 44 100 44 C 128 44 138 62 136 88 C 135 110 124 132 100 134 C 76 132 65 110 64 88 Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            fill={active ? '#072e63' : '#072e63'}
          />

          {/* Hair Hatching Lines */}
          <g stroke={secondaryColor} strokeWidth="1" strokeLinecap="round">
            <path d="M 68 62 Q 95 48 126 56" />
            <path d="M 70 54 Q 98 42 120 48" />
            <path d="M 72 46 Q 96 38 114 42" />
            <path d="M 65 72 C 70 65 80 62 90 60" />
            <path d="M 64 80 C 66 74 72 70 80 68" />
          </g>

          {/* Forehead & Brow Lines */}
          <path d="M 78 78 Q 88 74 96 76" stroke={strokeColor} strokeWidth="1.25" strokeLinecap="round" />
          <path d="M 104 76 Q 112 74 122 78" stroke={strokeColor} strokeWidth="1.25" strokeLinecap="round" />

          {/* Signature Round Tortoiseshell Spectacles */}
          <g stroke={strokeColor} strokeWidth="1.75" fill={active ? 'rgba(224, 208, 171, 0.12)' : 'none'}>
            <circle cx="86" cy="88" r="11" />
            <circle cx="114" cy="88" r="11" />
            {/* Bridge */}
            <path d="M 97 86 Q 100 84 103 86" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Temples */}
            <path d="M 75 88 L 65 84" stroke={strokeColor} strokeWidth="1.2" />
            <path d="M 125 88 L 135 84" stroke={strokeColor} strokeWidth="1.2" />
            {/* Eyes behind glass */}
            <circle cx="86" cy="88" r="2.2" fill={strokeColor} />
            <circle cx="114" cy="88" r="2.2" fill={strokeColor} />
            {/* Lens Glare */}
            {active && (
              <>
                <line x1="82" y1="83" x2="88" y2="83" stroke="#e0d0ab" strokeWidth="1" strokeLinecap="round" />
                <line x1="110" y1="83" x2="116" y2="83" stroke="#e0d0ab" strokeWidth="1" strokeLinecap="round" />
              </>
            )}
          </g>

          {/* Nose & Firm Jawline */}
          <path d="M 100 87 L 100 102 L 96 104" stroke={strokeColor} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 88 114 Q 100 118 112 114" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 94 122 Q 100 124 106 122" stroke={secondaryColor} strokeWidth="1" strokeLinecap="round" />

          {/* Tailored Suit Lapels & Tie */}
          <g stroke={strokeColor} strokeWidth="1.5" fill="none">
            {/* Collar */}
            <path d="M 85 134 L 100 148 L 115 134" />
            <path d="M 93 140 L 93 158 L 100 166 L 107 158 L 107 140" fill={active ? 'rgba(224, 208, 171, 0.15)' : 'none'} />
            {/* Tie Knot */}
            <polygon points="96,140 104,140 102,148 98,148" fill={strokeColor} />
            {/* Suit Coat Shoulders */}
            <path d="M 72 136 L 40 175 L 40 195 L 160 195 L 160 175 L 128 136" />
            <path d="M 72 136 L 85 178 L 100 185 L 115 178 L 128 136" />
            {/* Lapel Fold Lines */}
            <line x1="56" y1="165" x2="78" y2="185" stroke={secondaryColor} strokeWidth="1" />
            <line x1="144" y1="165" x2="122" y2="185" stroke={secondaryColor} strokeWidth="1" />
          </g>

          {/* Quill Pen / Constitution Nib Symbol */}
          <g opacity={active ? 0.9 : 0.4} stroke={strokeColor} strokeWidth="1.2">
            <path d="M 152 145 L 168 125 C 172 121 176 123 174 128 L 158 152 Z" fill={active ? 'rgba(224, 208, 171, 0.2)' : 'none'} />
            <line x1="152" y1="145" x2="147" y2="152" stroke={strokeColor} strokeWidth="1.5" />
          </g>
        </svg>
      )}

      {thinkerId === 'gandhi' && (
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full transition-transform duration-500 ease-out"
          style={{ transform: active ? 'scale(1.04)' : 'scale(1)' }}
        >
          {/* Background Charkha / Spinning Wheel Halo */}
          <g
            opacity={active ? 0.28 : 0.12}
            stroke={strokeColor}
            strokeWidth="0.8"
            className="transition-transform duration-1000"
            style={{ transformOrigin: '100px 100px', transform: active ? 'rotate(15deg)' : 'none' }}
          >
            <circle cx="100" cy="100" r="90" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="82" />
            <circle cx="100" cy="100" r="24" />
            {/* 12 Spoke Lines */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 100 + 24 * Math.cos(angle);
              const y1 = 100 + 24 * Math.sin(angle);
              const x2 = 100 + 82 * Math.cos(angle);
              const y2 = 100 + 82 * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>

          {/* Bald Head Contour - Clean Minimalist Oval */}
          <path
            d="M 68 94 C 64 60 74 44 100 44 C 126 44 136 60 132 94 C 130 114 120 132 100 134 C 80 132 70 114 68 94 Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            fill="#072e63"
          />

          {/* Forehead Light & Wrinkle Grooves */}
          <g stroke={secondaryColor} strokeWidth="1" strokeLinecap="round">
            <path d="M 82 58 Q 100 52 118 58" />
            <path d="M 85 66 Q 100 60 115 66" />
          </g>

          {/* Eyebrows */}
          <path d="M 78 78 Q 87 72 95 78" stroke={strokeColor} strokeWidth="1.25" strokeLinecap="round" />
          <path d="M 105 78 Q 113 72 122 78" stroke={strokeColor} strokeWidth="1.25" strokeLinecap="round" />

          {/* Distinctive Round Wire-Rim Spectacles */}
          <g stroke={strokeColor} strokeWidth="1.75" fill={active ? 'rgba(52, 211, 153, 0.08)' : 'none'}>
            <circle cx="86" cy="88" r="11.5" />
            <circle cx="114" cy="88" r="11.5" />
            {/* Wire Bridge */}
            <path d="M 97.5 87 Q 100 85 102.5 87" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Side Wires */}
            <path d="M 74.5 88 L 65 85" stroke={strokeColor} strokeWidth="1.2" />
            <path d="M 125.5 88 L 135 85" stroke={strokeColor} strokeWidth="1.2" />
            {/* Gentle Eyes */}
            <circle cx="86" cy="88" r="2.2" fill={strokeColor} />
            <circle cx="114" cy="88" r="2.2" fill={strokeColor} />
          </g>

          {/* Nose, Subtle Moustache & Serene Smile */}
          <path d="M 100 87 L 99 104 L 95 106" stroke={strokeColor} strokeWidth="1.25" strokeLinecap="round" />
          {/* Moustache */}
          <path d="M 86 112 C 92 110 97 114 100 112 C 103 114 108 110 114 112" stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" />
          {/* Smile line */}
          <path d="M 88 118 Q 100 124 112 118" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />

          {/* Distinctive Ears */}
          <path d="M 68 84 C 60 84 58 100 68 108" stroke={strokeColor} strokeWidth="1.4" fill="none" />
          <path d="M 132 84 C 140 84 142 100 132 108" stroke={strokeColor} strokeWidth="1.4" fill="none" />

          {/* Draped Khadi Shawl Folds */}
          <g stroke={strokeColor} strokeWidth="1.5" fill="none">
            {/* Neck */}
            <path d="M 86 132 L 86 142" stroke={secondaryColor} strokeWidth="1.2" />
            <path d="M 114 132 L 114 142" stroke={secondaryColor} strokeWidth="1.2" />
            {/* Main Shawl Drape across right shoulder */}
            <path d="M 50 160 Q 85 140 120 148 L 155 170 L 155 195 L 45 195 L 45 170 Z" />
            <path d="M 60 170 Q 95 155 135 168" stroke={secondaryColor} strokeWidth="1.2" />
            <path d="M 50 182 Q 90 170 145 182" stroke={secondaryColor} strokeWidth="1.2" />
            <path d="M 80 145 L 65 195" stroke={secondaryColor} strokeWidth="1" strokeDasharray="3 2" />
          </g>

          {/* Bamboo Walking Staff Accent */}
          <line x1="162" y1="110" x2="162" y2="195" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" opacity={active ? 0.9 : 0.4} />
        </svg>
      )}

      {thinkerId === 'kant' && (
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full transition-transform duration-500 ease-out"
          style={{ transform: active ? 'scale(1.04)' : 'scale(1)' }}
        >
          {/* Background Celestial Sphere & Coordinate Orbits */}
          <g opacity={active ? 0.28 : 0.12} stroke={strokeColor} strokeWidth="0.8">
            <ellipse cx="100" cy="100" rx="90" ry="38" transform="rotate(-25 100 100)" strokeDasharray="4 3" />
            <ellipse cx="100" cy="100" rx="90" ry="38" transform="rotate(35 100 100)" strokeDasharray="4 3" />
            <circle cx="100" cy="100" r="92" />
            {/* Cardinal ticks */}
            <line x1="100" y1="5" x2="100" y2="15" strokeWidth="1.5" />
            <line x1="100" y1="185" x2="100" y2="195" strokeWidth="1.5" />
            <line x1="5" y1="100" x2="15" y2="100" strokeWidth="1.5" />
            <line x1="185" y1="100" x2="195" y2="100" strokeWidth="1.5" />
          </g>

          {/* 18th-Century Powdered Wig Silhouette */}
          <path
            d="M 60 92 C 52 50 68 38 100 38 C 132 38 148 50 140 92 C 146 104 142 118 132 124 C 122 130 116 134 100 134 C 84 134 78 130 68 124 C 58 118 54 104 60 92 Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            fill="#072e63"
          />

          {/* Powdered Wig Curls & Roll Details */}
          <g stroke={secondaryColor} strokeWidth="1.2" strokeLinecap="round">
            {/* Top wave */}
            <path d="M 75 48 C 88 40 112 40 125 48" />
            <path d="M 72 58 C 86 50 114 50 128 58" />
            {/* Left side rolls */}
            <path d="M 58 72 C 52 78 54 86 60 90" />
            <path d="M 56 86 C 50 92 52 100 58 104" />
            <path d="M 54 100 C 48 106 50 114 58 118" />
            {/* Right side rolls */}
            <path d="M 142 72 C 148 78 146 86 140 90" />
            <path d="M 144 86 C 150 92 148 100 142 104" />
            <path d="M 146 100 C 152 106 150 114 142 118" />
          </g>

          {/* Sharp Intellectual Forehead & Penetrating Eyes */}
          <g stroke={strokeColor} strokeWidth="1.3" strokeLinecap="round">
            <path d="M 78 74 Q 88 68 96 72" />
            <path d="M 104 72 Q 112 68 122 74" />
            {/* Piercing eyes (no spectacles) */}
            <circle cx="86" cy="82" r="2.4" fill={strokeColor} />
            <circle cx="114" cy="82" r="2.4" fill={strokeColor} />
            <path d="M 80 80 Q 86 77 92 80" strokeWidth="1.2" fill="none" />
            <path d="M 108 80 Q 114 77 120 80" strokeWidth="1.2" fill="none" />
          </g>

          {/* Classical Aquiline Nose & Pensive Lips */}
          <path d="M 100 78 L 100 98 L 95 101" stroke={strokeColor} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M 89 110 Q 100 112 111 110" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 94 118 Q 100 120 106 118" stroke={secondaryColor} strokeWidth="1" strokeLinecap="round" />

          {/* Ruffled Cravat & 18th-Century Waistcoat Collar */}
          <g stroke={strokeColor} strokeWidth="1.5" fill="none">
            {/* Neck cravat ruffles */}
            <path d="M 88 132 Q 100 140 112 132" />
            <path d="M 92 136 C 88 145 94 154 100 156 C 106 154 112 145 108 136" fill={active ? 'rgba(56, 189, 248, 0.1)' : 'none'} />
            <path d="M 95 146 Q 100 152 105 146" stroke={secondaryColor} strokeWidth="1" />
            {/* Coat Collars */}
            <path d="M 72 138 L 44 175 L 44 195 L 156 195 L 156 175 L 128 138" />
            <path d="M 72 138 L 84 185 L 100 195 L 116 185 L 128 138" />
            {/* Waistcoat Buttons */}
            <circle cx="100" cy="168" r="1.8" fill={strokeColor} />
            <circle cx="100" cy="180" r="1.8" fill={strokeColor} />
            <circle cx="100" cy="192" r="1.8" fill={strokeColor} />
          </g>

          {/* Moral Law Compass / Geometric Hexagon Motif */}
          <g opacity={active ? 0.9 : 0.4} stroke={strokeColor} strokeWidth="1.2">
            <polygon points="160,135 172,142 172,156 160,163 148,156 148,142" fill={active ? 'rgba(56, 189, 248, 0.15)' : 'none'} />
            <circle cx="160" cy="149" r="3" fill={strokeColor} />
          </g>
        </svg>
      )}

      {/* Decorative Corner Filigree Ticks */}
      <span className="absolute top-1 left-1 font-mono text-[9px] text-[#0194a8]/50 select-none">┌</span>
      <span className="absolute top-1 right-1 font-mono text-[9px] text-[#0194a8]/50 select-none">┐</span>
      <span className="absolute bottom-1 left-1 font-mono text-[9px] text-[#0194a8]/50 select-none">└</span>
      <span className="absolute bottom-1 right-1 font-mono text-[9px] text-[#0194a8]/50 select-none">┘</span>
    </div>
  );
}
