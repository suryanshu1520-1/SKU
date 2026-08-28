/**
 * Hand-drawn ASCII busts for the Canon reader's terminal cards.
 *
 * Each thinker is a fixed 17-col base grid with two rows swapped to animate:
 * row 2 (eyes) and row 4 (mouth). Composing frames by substitution — rather
 * than storing four full duplicated grids — guarantees every frame for a
 * given thinker stays pixel-identical outside those two rows.
 */

export interface ThinkerArt {
  base: string[];
  eyes: { open: string; closed: string };
  mouth: { closed: string; openA: string; openB: string };
  pullQuote: {
    passageId: string;
    text: string;
    citation: { paper: string; year: number };
  };
}

export type EyesKey = keyof ThinkerArt['eyes'];
export type MouthKey = keyof ThinkerArt['mouth'];

export function composeFrame(art: ThinkerArt, eyesKey: EyesKey, mouthKey: MouthKey): string[] {
  const rows = art.base.slice();
  rows[2] = art.eyes[eyesKey];
  rows[4] = art.mouth[mouthKey];
  return rows;
}

export const THINKER_ASCII: Record<string, ThinkerArt> = {
  // Side-parted hair, round glasses, suit lapels, a book held at the chest.
  ambedkar: {
    base: [
      '    ╭─────╮    ',
      '   ╱░     ░╲   ',
      '  ',                       // eyes row — overwritten
      '  │         │  ',
      '  ',                       // mouth row — overwritten
      '   ╲       ╱   ',
      '     │   │     ',
      '    ╱─────╲    ',
      '   ╱    ┃    ╲  ',
      '  ╱           ╲ ',
      '  ╱│  ███  │╲  ',
      '    ╰─────╯    ',
      '                ',
    ],
    eyes: {
      open:   '  │  ●───●  │  ',
      closed: '  │  ─────  │  ',
    },
    mouth: {
      closed: '  │    ◡    │  ',
      openA:  '  │    ○    │  ',
      openB:  '  │    ◠    │  ',
    },
    pullQuote: {
      passageId: 'ambedkar-aoc-p2',
      text: 'Democracy is not merely a form of Government. It is primarily a mode of associated living…',
      citation: { paper: 'GS-IV', year: 2021 },
    },
  },

  // Bald head, round glasses, a draped sash, a charkha turning in his hands.
  gandhi: {
    base: [
      '    ╭─────╮    ',
      '   ╱       ╲   ',
      '  ',
      '  │         │  ',
      '  ',
      '   ╲       ╱   ',
      '     │   │     ',
      '    ╱─────╲    ',
      '   ╱         ╲  ',
      '  ╱           ╲ ',
      '  ╱│  (+)  │╲  ',
      '    ╰─────╯    ',
      '                ',
    ],
    eyes: {
      open:   '  │  ●───●  │  ',
      closed: '  │  ─────  │  ',
    },
    mouth: {
      closed: '  │    ◡    │  ',
      openA:  '  │    ○    │  ',
      openB:  '  │    ◠    │  ',
    },
    pullQuote: {
      passageId: 'gandhi-hs-p2',
      text: 'Passive resistance is a method of securing rights by personal suffering; it is the reverse of resistance by arms.',
      citation: { paper: 'GS-IV', year: 2019 },
    },
  },

  // Powdered wig with side curls, bare eyes (no glasses), a ruffled cravat,
  // a tied scroll of "universal law" held at the chest.
  kant: {
    base: [
      '   ╭∿∿∿∿∿∿∿╮   ',
      '  ((       ))  ',
      '  ',
      '  │         │  ',
      '  ',
      '   ╲       ╱   ',
      '     │   │     ',
      '    ╱≈≈≈≈≈╲    ',
      '   ╱    │    ╲  ',
      '  ╱           ╲ ',
      '  ╱│  (≡)  │╲  ',
      '    ╰─────╯    ',
      '                ',
    ],
    eyes: {
      open:   '  │   •   •  │  ',
      closed: '  │   ⁃   ⁃  │  ',
    },
    mouth: {
      closed: '  │    ◡    │  ',
      openA:  '  │    ○    │  ',
      openB:  '  │    ◠    │  ',
    },
    pullQuote: {
      passageId: 'kant-fpm-p2',
      text: 'Act only on that maxim whereby thou canst at the same time will that it should become a universal law.',
      citation: { paper: 'GS-IV', year: 2022 },
    },
  },
};
