import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { NavTab } from '../lib/navItems';

export type NavIconId = NavTab | 'home';

interface AnimatedNavIconProps {
  id: NavIconId;
  isActive?: boolean;
  isHovered?: boolean;
  className?: string;
  size?: number;
}

/**
 * AnimatedNavIcon: Craftsman micro-animated SVG navigation icons.
 *
 * Implements bespoke physical and kinetic behaviors on hover:
 * - 'arena' (Swords): Dual blades swing back and battle with a spark clash at impact.
 * - 'tracker' (Globe): 3D longitudinal spherical rotation.
 * - 'library' (Layers): Slabs lift into floating pillars and compress into a crystalline stack.
 * - 'humanities' (BookOpen): Center parchment pages flip sequentially across the spine.
 * - 'observatory' (Radio): Concentric radio waves pulsate and broadcast outwards from the core beacon.
 * - 'leaderboard' (Trophy): Trophy elevates, tilts, and rings up with victory sparkles.
 * - 'home' (House): Architectural roof lifts with a warm hearth pulse.
 * - 'profile' (User): Candidate silhouette nods affirmatively with an expanding aura halo.
 */
export default function AnimatedNavIcon({
  id,
  isActive = false,
  isHovered: externalHover,
  className = 'w-4 h-4',
  size = 20,
}: AnimatedNavIconProps) {
  const prefersReducedMotion = useReducedMotion();
  const [internalHover, setInternalHover] = useState(false);
  const [hoverKey, setHoverKey] = useState(0);

  const isHovered = externalHover !== undefined ? externalHover : internalHover;

  const handleMouseEnter = () => {
    setInternalHover(true);
    setHoverKey((k) => k + 1);
  };

  const handleMouseLeave = () => {
    setInternalHover(false);
  };

  const strokeColor = 'currentColor';

  if (prefersReducedMotion) {
    // Accessible fallback static SVG rendering
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {id === 'home' && (
          <>
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </>
        )}
        {id === 'arena' && (
          <>
            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
            <line x1="13" x2="19" y1="19" y2="13" />
            <line x1="16" x2="20" y1="16" y2="20" />
            <line x1="19" x2="21" y1="21" y2="19" />
            <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
            <line x1="5" x2="9" y1="14" y2="18" />
            <line x1="7" x2="4" y1="17" y2="20" />
            <line x1="3" x2="5" y1="19" y2="21" />
          </>
        )}
        {id === 'tracker' && (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </>
        )}
        {id === 'library' && (
          <>
            <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
            <path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2 12.5" />
            <path d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2 17.5" />
          </>
        )}
        {id === 'humanities' && (
          <>
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </>
        )}
        {id === 'observatory' && (
          <>
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
            <circle cx="12" cy="12" r="2" />
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
          </>
        )}
        {id === 'leaderboard' && (
          <>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </>
        )}
        {id === 'profile' && (
          <>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        )}
      </svg>
    );
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        key={hoverKey}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full overflow-visible"
      >
        {/* ─────────────────────────────────────────────────────────────
            1. HOME — Architectural Hearth & Roof Lift
        ───────────────────────────────────────────────────────────── */}
        {id === 'home' && (
          <g>
            {/* Gable Roof with spring lift */}
            <motion.path
              d="m3 9 9-7 9 7"
              animate={isHovered ? { y: [0, -3, 0], scale: [1, 1.05, 1] } : { y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              style={{ transformOrigin: '12px 6px' }}
            />
            {/* Foundation Walls */}
            <path d="M5 10v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10" />
            {/* Threshold Doorway with welcoming golden glow pulse */}
            <motion.polyline
              points="9 22 9 12 15 12 15 22"
              animate={isHovered ? { opacity: [0.6, 1, 0.8], strokeWidth: [2, 2.4, 2] } : { opacity: 0.9, strokeWidth: 2 }}
              transition={{ duration: 0.4 }}
            />
          </g>
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. ARENA — Swords Clashing & Battling in Mid-Air
        ───────────────────────────────────────────────────────────── */}
        {id === 'arena' && (
          <g>
            {/* Sword 1: Top-Left tip to Bottom-Right hilt */}
            <motion.g
              animate={
                isHovered
                  ? {
                      rotate: [0, -18, 14, -6, 0],
                      x: [0, -0.8, 0.8, 0],
                      y: [0, -0.8, 0.8, 0],
                    }
                  : { rotate: 0, x: 0, y: 0 }
              }
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: '12px 12px' }}
            >
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
              <line x1="13" x2="19" y1="19" y2="13" />
              <line x1="16" x2="20" y1="16" y2="20" />
              <line x1="19" x2="21" y1="21" y2="19" />
            </motion.g>

            {/* Sword 2: Top-Right tip to Bottom-Left hilt */}
            <motion.g
              animate={
                isHovered
                  ? {
                      rotate: [0, 18, -14, 6, 0],
                      x: [0, 0.8, -0.8, 0],
                      y: [0, -0.8, 0.8, 0],
                    }
                  : { rotate: 0, x: 0, y: 0 }
              }
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: '12px 12px' }}
            >
              <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
              <line x1="5" x2="9" y1="14" y2="18" />
              <line x1="7" x2="4" y1="17" y2="20" />
              <line x1="3" x2="5" y1="19" y2="21" />
            </motion.g>

            {/* Battle Clash Spark Flash at Crossing Center (12, 12) */}
            <motion.circle
              cx="12"
              cy="12"
              r="2.5"
              fill="#e0d0ab"
              stroke="none"
              initial={{ scale: 0, opacity: 0 }}
              animate={
                isHovered
                  ? {
                      scale: [0, 2, 0],
                      opacity: [0, 1, 0],
                    }
                  : { scale: 0, opacity: 0 }
              }
              transition={{ duration: 0.35, delay: 0.1 }}
            />
          </g>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. TRACKER (DAILY BRIEF) — 3D Rotating Globe
        ───────────────────────────────────────────────────────────── */}
        {id === 'tracker' && (
          <g>
            {/* Outer Stable Orbital Meridian */}
            <circle cx="12" cy="12" r="10" />
            {/* Equator */}
            <line x1="2" y1="12" x2="22" y2="12" />

            {/* Longitudinal Meridian Spinning Across Sphere */}
            <motion.path
              d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
              animate={
                isHovered
                  ? {
                      scaleX: [1, 0.2, -1, -0.2, 1],
                      opacity: [1, 0.7, 1, 0.7, 1],
                    }
                  : { scaleX: 1, opacity: 1 }
              }
              transition={{
                duration: 1.1,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '12px 12px' }}
            />

            {/* Secondary Latitude Ring for Depth */}
            <motion.path
              d="M 4 8 Q 12 11 20 8"
              animate={isHovered ? { y: [0, 0.5, 0] } : { y: 0 }}
              transition={{ duration: 0.8 }}
              opacity={0.4}
            />
            <motion.path
              d="M 4 16 Q 12 13 20 16"
              animate={isHovered ? { y: [0, -0.5, 0] } : { y: 0 }}
              transition={{ duration: 0.8 }}
              opacity={0.4}
            />
          </g>
        )}

        {/* ─────────────────────────────────────────────────────────────
            4. LIBRARY — Syllabus Pillars Stacking on Top of Each Other
        ───────────────────────────────────────────────────────────── */}
        {id === 'library' && (
          <g>
            {/* Top Slab: Lifts up high and drops into lock */}
            <motion.path
              d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
              animate={
                isHovered
                  ? {
                      y: [0, -5, 1, 0],
                      scale: [1, 1.05, 0.98, 1],
                    }
                  : { y: 0, scale: 1 }
              }
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ transformOrigin: '12px 6px' }}
            />

            {/* Middle Slab: Responsive cushion compression */}
            <motion.path
              d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2 12.5"
              animate={
                isHovered
                  ? {
                      y: [0, -1.8, 0.5, 0],
                    }
                  : { y: 0 }
              }
              transition={{ duration: 0.55, delay: 0.05, ease: 'easeOut' }}
            />

            {/* Bottom Foundation Slab: Grounds and catches the stack */}
            <motion.path
              d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2 17.5"
              animate={
                isHovered
                  ? {
                      y: [0, 3, -0.8, 0],
                    }
                  : { y: 0 }
              }
              transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
            />
          </g>
        )}

        {/* ─────────────────────────────────────────────────────────────
            5. HUMANITIES — Book Flipping Pages Sequentially
        ───────────────────────────────────────────────────────────── */}
        {id === 'humanities' && (
          <g>
            {/* Left Static Binding & Cover */}
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            {/* Right Static Binding & Cover */}
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />

            {/* Center Flipping Page 1 (Right to Left sweep) */}
            <motion.path
              d="M12 7 C 14 5 18 5 21 6 L 21 19 C 18 18 14 18 12 21 Z"
              strokeWidth="1.5"
              fill="rgba(224,208,171,0.2)"
              animate={
                isHovered
                  ? {
                      scaleX: [1, 0, -1],
                      opacity: [0.8, 0.4, 0.8],
                    }
                  : { scaleX: 1, opacity: 0 }
              }
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{ transformOrigin: '12px 14px' }}
            />

            {/* Center Flipping Page 2 (Follow-up Flutter) */}
            <motion.path
              d="M12 7 C 14 5 18 5 21 6 L 21 19 C 18 18 14 18 12 21 Z"
              strokeWidth="1.2"
              fill="rgba(224,208,171,0.15)"
              animate={
                isHovered
                  ? {
                      scaleX: [1, 0, -1],
                      opacity: [0.7, 0.3, 0.7],
                    }
                  : { scaleX: 1, opacity: 0 }
              }
              transition={{ duration: 0.5, delay: 0.12, ease: 'easeInOut' }}
              style={{ transformOrigin: '12px 14px' }}
            />

            {/* Spine Center Axis */}
            <line x1="12" y1="7" x2="12" y2="21" strokeWidth="2.5" />
          </g>
        )}

        {/* ─────────────────────────────────────────────────────────────
            6. OBSERVATORY — Radiating Radar Waves Pulsating Outwards
        ───────────────────────────────────────────────────────────── */}
        {id === 'observatory' && (
          <g>
            {/* Center Core Beacon Pulsing */}
            <motion.circle
              cx="12"
              cy="12"
              r="2"
              fill="#e0d0ab"
              animate={
                isHovered
                  ? {
                      scale: [1, 1.5, 1],
                      fill: ['#e0d0ab', '#ffffff', '#e0d0ab'],
                    }
                  : { scale: 1, fill: '#e0d0ab' }
              }
              transition={{ duration: 0.6, repeat: isHovered ? Infinity : 0, repeatDelay: 0.2 }}
              style={{ transformOrigin: '12px 12px' }}
            />

            {/* Inner Concentric Radio Wave Arcs */}
            <motion.g
              animate={
                isHovered
                  ? {
                      scale: [0.95, 1.25, 1],
                      opacity: [0.3, 1, 0.3],
                    }
                  : { scale: 1, opacity: 0.7 }
              }
              transition={{ duration: 0.7, repeat: isHovered ? Infinity : 0, ease: 'easeInOut' }}
              style={{ transformOrigin: '12px 12px' }}
            >
              <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
              <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
            </motion.g>

            {/* Outer Dispatched Radar Waves */}
            <motion.g
              animate={
                isHovered
                  ? {
                      scale: [0.9, 1.35, 1],
                      opacity: [0.1, 0.9, 0.2],
                    }
                  : { scale: 1, opacity: 0.5 }
              }
              transition={{
                duration: 0.7,
                delay: 0.12,
                repeat: isHovered ? Infinity : 0,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '12px 12px' }}
            >
              <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
              <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
            </motion.g>
          </g>
        )}

        {/* ─────────────────────────────────────────────────────────────
            7. LEADERBOARD — Trophy Ringing Up & Sparkling Victory
        ───────────────────────────────────────────────────────────── */}
        {id === 'leaderboard' && (
          <g>
            {/* Trophy Pedestal Base */}
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />

            {/* Trophy Cup & Handles: Elevates & Rings with Joyful Bell Vibrations */}
            <motion.g
              animate={
                isHovered
                  ? {
                      y: [0, -3.5, 0],
                      rotate: [0, -14, 14, -10, 10, -4, 4, 0],
                    }
                  : { y: 0, rotate: 0 }
              }
              transition={{ duration: 0.75, ease: 'easeOut' }}
              style={{ transformOrigin: '12px 18px' }}
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />

              {/* Sparkle Glint at the Trophy Rim */}
              <motion.circle
                cx="18"
                cy="3"
                r="1.8"
                fill="#e0d0ab"
                stroke="none"
                animate={isHovered ? { scale: [0, 1.4, 0], opacity: [0, 1, 0] } : { scale: 0, opacity: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
              />
            </motion.g>
          </g>
        )}

        {/* ─────────────────────────────────────────────────────────────
            8. PROFILE — Candidate Avatar Nodding with Aura Ripple
        ───────────────────────────────────────────────────────────── */}
        {id === 'profile' && (
          <g>
            {/* Torso & Shoulder Foundation */}
            <motion.path
              d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
              animate={isHovered ? { scaleX: [1, 1.05, 1], y: [0, -0.8, 0] } : { scaleX: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ transformOrigin: '12px 20px' }}
            />

            {/* Crown Halo Aura Ring */}
            <motion.circle
              cx="12"
              cy="7"
              r="6.5"
              stroke="#e0d0ab"
              strokeWidth="1"
              strokeDasharray="2 2"
              fill="none"
              animate={isHovered ? { scale: [0.8, 1.25, 1], opacity: [0, 0.7, 0] } : { scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ transformOrigin: '12px 7px' }}
            />

            {/* Candidate Head with Affirmative Nod */}
            <motion.circle
              cx="12"
              cy="7"
              r="4"
              animate={isHovered ? { y: [0, -2.5, 0.8, 0] } : { y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
