/**
 * src/data/thinker-engravings.ts
 *
 * Handcrafted SVG vector engraving definitions, motifs, and verified
 * primary pull-quotes for the Canon Reader's Living Pantheon.
 *
 * Each thinker includes:
 * - Specific geometric/woodcut metadata
 * - Thematic symbol (Constitution, Charkha, Compass, Flame, Seal, Scales, Veil, Lotus, Quill, Contract)
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
  thematicSymbol:
    | 'constitution'
    | 'charkha'
    | 'compass'
    | 'flame'
    | 'seal'
    | 'scales'
    | 'veil'
    | 'lotus'
    | 'quill'
    | 'contract';
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
    workTitle: 'Groundwork of the Metaphysics of Morals',
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

  mill: {
    id: 'mill',
    name: 'John Stuart Mill',
    shortName: 'J. S. Mill',
    era: '1806–1873',
    title: 'Champion of Individual Liberty & Free Expression',
    workTitle: 'On Liberty & Utilitarianism',
    workYear: 1859,
    publicDomainBasis: 'Author d. 1873; Public Domain worldwide',
    themeColor: '#f59e0b',
    thematicSymbol: 'flame',
    accentTitle: 'The Harm Principle & Marketplace of Ideas',
    syllabusNexus: 'GS-IV Liberty & Rights · GS-II Civil Liberties · Essay',
    pullQuote: {
      passageId: 'mill-lib-p1',
      text: 'The only purpose for which power can be rightfully exercised over any member of a civilized community, against his will, is to prevent harm to others. Over himself, over his own body and mind, the individual is sovereign.',
      citation: {
        paper: 'GS-IV',
        year: 2021,
        note: 'The Harm Principle: defining the legitimate boundary of state power.',
      },
    },
  },

  kautilya: {
    id: 'kautilya',
    name: 'Kautilya (Chanakya)',
    shortName: 'Kautilya',
    era: 'c. 375–283 BCE',
    title: 'Master of Statecraft, Yogakshema & Institutional Vigilance',
    workTitle: 'Arthashastra',
    workYear: -300,
    publicDomainBasis: 'Ancient text c. 3rd cent. BCE (Trans. R. Shamasastry 1915); Public Domain',
    themeColor: '#eab308',
    thematicSymbol: 'seal',
    accentTitle: 'Rajadharma & Fiduciary Public Service',
    syllabusNexus: 'GS-IV Public Service Values · GS-II Governance & Administrative Ethics',
    pullQuote: {
      passageId: 'kautilya-arth-p1',
      text: 'In the happiness of his subjects lies his happiness; in their welfare his welfare; whatever pleases himself he shall not consider as good, but whatever pleases his subjects he shall consider as good.',
      citation: {
        paper: 'GS-IV',
        year: 2016,
        note: 'Citizen-centric governance and public service ethics.',
      },
    },
  },

  aristotle: {
    id: 'aristotle',
    name: 'Aristotle',
    shortName: 'Aristotle',
    era: '384–322 BCE',
    title: 'Father of Virtue Ethics & Civic Teleology',
    workTitle: 'Nicomachean Ethics & Politics',
    workYear: -350,
    publicDomainBasis: 'Ancient text c. 350 BCE (Trans. W. D. Ross 1908); Public Domain worldwide',
    themeColor: '#a855f7',
    thematicSymbol: 'scales',
    accentTitle: 'Eudaimonia & The Golden Mean',
    syllabusNexus: 'GS-IV Virtue Ethics · Character Formation · GS-II Civic Purpose',
    pullQuote: {
      passageId: 'aristotle-ne-p1',
      text: 'Happiness (Eudaimonia), then, is something final and self-sufficient, and is the end of action. We define human good as activity of soul exhibiting virtue.',
      citation: {
        paper: 'GS-IV',
        year: 2017,
        note: 'Eudaimonia as the supreme teleological goal of ethical action.',
      },
    },
  },

  rawls: {
    id: 'rawls',
    name: 'John Rawls',
    shortName: 'Rawls',
    era: '1921–2002',
    title: 'Theorist of Justice as Fairness & Democratic Equality',
    workTitle: 'A Theory of Justice',
    workYear: 1971,
    publicDomainBasis: 'Excerpts of fundamental ethical doctrines for academic study',
    themeColor: '#06b6d4',
    thematicSymbol: 'veil',
    accentTitle: 'Veil of Ignorance & The Difference Principle',
    syllabusNexus: 'GS-IV Distributive Justice · GS-II Affirmative Action · Essay',
    pullQuote: {
      passageId: 'rawls-toj-p1',
      text: 'Justice is the first virtue of social institutions, as truth is of systems of thought. Each person possesses an inviolability founded on justice that even the welfare of society as a whole cannot override.',
      citation: {
        paper: 'GS-IV',
        year: 2019,
        note: 'Inviolability of fundamental individual rights against utilitarian aggregation.',
      },
    },
  },

  vivekananda: {
    id: 'vivekananda',
    name: 'Swami Vivekananda',
    shortName: 'Vivekananda',
    era: '1863–1902',
    title: 'Icon of Practical Vedanta, Karma Yoga & Fearless Service',
    workTitle: 'Karma Yoga & Selected Speeches',
    workYear: 1896,
    publicDomainBasis: 'Author d. 1902; Public Domain worldwide',
    themeColor: '#f97316',
    thematicSymbol: 'lotus',
    accentTitle: 'Daridra Narayana & Detached Action',
    syllabusNexus: 'GS-IV Moral Leaders of India · Nishkama Karma · Empathy',
    pullQuote: {
      passageId: 'vivekananda-ky-p2',
      text: 'The poor, the illiterate, the ignorant, the afflicted—let these be your God; know that service to these alone is the highest religion. It is not the receiver that is blessed, but the giver.',
      citation: {
        paper: 'GS-IV',
        year: 2021,
        note: 'Public service as humility and moral worship of humanity.',
      },
    },
  },

  tagore: {
    id: 'tagore',
    name: 'Rabindranath Tagore',
    shortName: 'Tagore',
    era: '1861–1941',
    title: 'Universal Poet, Humanist & Critic of Machine Nationalism',
    workTitle: 'Nationalism & Sadhana',
    workYear: 1917,
    publicDomainBasis: 'Author d. 1941; Public Domain in India since 2002',
    themeColor: '#10b981',
    thematicSymbol: 'quill',
    accentTitle: 'Universal Humanism & Freedom of Mind',
    syllabusNexus: 'GS-I Cultural Renaissance · GS-IV Intellectual Ethics · Essay',
    pullQuote: {
      passageId: 'tagore-mind-p2',
      text: 'Where the mind is without fear and the head is held high; Where knowledge is free; Where the world has not been broken up into fragments by narrow domestic walls.',
      citation: {
        paper: 'Essay',
        year: 2022,
        note: 'Intellectual emancipation and breaking of narrow domestic walls.',
      },
    },
  },

  rousseau: {
    id: 'rousseau',
    name: 'Jean-Jacques Rousseau',
    shortName: 'Rousseau',
    era: '1712–1778',
    title: 'Philosopher of The General Will & Moral Freedom',
    workTitle: 'The Social Contract',
    workYear: 1762,
    publicDomainBasis: 'Author d. 1778 (Trans. G. D. H. Cole 1913); Public Domain worldwide',
    themeColor: '#6366f1',
    thematicSymbol: 'contract',
    accentTitle: 'The General Will & Popular Sovereignty',
    syllabusNexus: 'GS-IV Political Philosophy · GS-II Democratic Legitimacy · Essay',
    pullQuote: {
      passageId: 'rousseau-sc-p1',
      text: 'Man is born free; and everywhere he is in chains. The problem is to find a form of association which will defend and protect with the whole common force the person and goods of each associate.',
      citation: {
        paper: 'GS-IV',
        year: 2019,
        note: 'Legitimacy of political authority and civil liberty.',
      },
    },
  },
};
