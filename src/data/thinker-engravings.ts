/**
 * src/data/thinker-engravings.ts
 *
 * Handcrafted SVG vector engraving definitions, motifs, and verified
 * primary pull-quotes for the Canon Reader's Living Pantheon.
 *
 * Each thinker includes:
 * - Specific geometric/woodcut metadata
 * - Thematic symbol (Constitution folio, Charkha wheel, Celestial compass)
 * - Exact pull-quote matching src/data/humanities-canon.json
 * - UPSC citation metadata
 */

export interface ThinkerEngraving {
  id: string;
  name: string;
  shortName: string;
  era: string;
  title: string;
  workTitle: string;
  workYear: number;
  publicDomainBasis: string;
  themeColor: string; // Accent highlight
  thematicSymbol: 'constitution' | 'charkha' | 'compass';
  accentTitle: string;
  syllabusNexus: string;
  pullQuote: {
    passageId: string;
    text: string;
    citation: {
      paper: string;
      year: number;
      note: string;
    };
  };
}

export const THINKER_ENGRAVINGS: Record<string, ThinkerEngraving> = {
  ambedkar: {
    id: 'ambedkar',
    name: 'Dr. B. R. Ambedkar',
    shortName: 'Ambedkar',
    era: '1891–1956',
    title: 'Architect of Social Democracy & Constitutional Morality',
    workTitle: 'Annihilation of Caste',
    workYear: 1936,
    publicDomainBasis: 'Author d. 1956; Public Domain in India since 2017 (60y post-death)',
    themeColor: '#e0d0ab',
    thematicSymbol: 'constitution',
    accentTitle: 'Social Endosmosis & Moral Liberty',
    syllabusNexus: 'GS-IV Moral Thinkers · GS-I Social Reform & Justice · Essay',
    pullQuote: {
      passageId: 'ambedkar-aoc-p2',
      text: 'Democracy is not merely a form of Government. It is primarily a mode of associated living, of conjoint communicated experience. It is essentially an attitude of respect and reverence towards fellowmen.',
      citation: {
        paper: 'GS-IV',
        year: 2021,
        note: 'Relevance to moral equality, democracy as associated living, and fraternity.',
      },
    },
  },

  gandhi: {
    id: 'gandhi',
    name: 'Mahatma Gandhi',
    shortName: 'Gandhi',
    era: '1869–1948',
    title: 'Apostle of Satyagraha & Moral Swaraj',
    workTitle: 'Hind Swaraj / Indian Home Rule',
    workYear: 1909,
    publicDomainBasis: 'Author d. 1948; Public Domain in India since 2009 (60y post-death)',
    themeColor: '#34d399',
    thematicSymbol: 'charkha',
    accentTitle: 'Soul-Force & Unconditional Self-Rule',
    syllabusNexus: 'GS-IV Ethical Leadership · GS-I Freedom Struggle · Essay',
    pullQuote: {
      passageId: 'gandhi-hs-p2',
      text: 'Passive resistance is a method of securing rights by personal suffering; it is the reverse of resistance by arms. When I refuse to do a thing that is repugnant to my conscience, I use soul-force.',
      citation: {
        paper: 'GS-IV',
        year: 2019,
        note: 'Passive resistance, soul-force vs brute force, and moral courage.',
      },
    },
  },

  kant: {
    id: 'kant',
    name: 'Immanuel Kant',
    shortName: 'Kant',
    era: '1724–1804',
    title: 'Philosopher of Pure Reason & Deontological Ethics',
    workTitle: 'Fundamental Principles of the Metaphysic of Morals',
    workYear: 1785,
    publicDomainBasis: 'Author d. 1804 (Trans. T. K. Abbott 1898); Public Domain worldwide',
    themeColor: '#38bdf8',
    thematicSymbol: 'compass',
    accentTitle: 'Categorical Imperative & Humanity as an End',
    syllabusNexus: 'GS-IV Western Moral Philosophers · Deontology · Universal Law',
    pullQuote: {
      passageId: 'kant-fpm-p2',
      text: 'Act only on that maxim whereby thou canst at the same time will that it should become a universal law.',
      citation: {
        paper: 'GS-IV',
        year: 2022,
        note: 'The Categorical Imperative and universalizability test for moral maxims.',
      },
    },
  },
};
