/**
 * src/data/canon-original-works.ts
 *
 * Registry and dynamic on-demand loaders for canonical primary works.
 * Keeps initial bundle size tiny by code-splitting the full texts.
 * Supports both Vite client runtime and Node.js testing environments.
 */

export interface CanonChapter {
  id: string;
  title: string;
}

export interface CanonWorkMeta {
  thinkerId: string;
  title: string;
  author: string;
  year: number | string;
  pdBasis: string;
  source: string;
  fileName: string;
  wordCountApprox: number;
  readingTimeMinutes: number;
  summary: string;
  chapters: CanonChapter[];
  loadContent: () => Promise<string>;
}

async function loadCanonFile(fileName: string, clientLoader: () => Promise<{ default: string }>): Promise<string> {
  if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
    const fsMod = 'node:fs';
    const pathMod = 'node:path';
    const fs = await import(/* @vite-ignore */ fsMod);
    const path = await import(/* @vite-ignore */ pathMod);
    const fullPath = path.resolve(process.cwd(), 'content/canon', fileName);
    return fs.readFileSync(fullPath, 'utf8');
  }
  const mod = await clientLoader();
  return mod.default;
}

export const CANON_ORIGINAL_WORKS: Record<string, CanonWorkMeta> = {
  ambedkar: {
    thinkerId: 'ambedkar',
    title: 'Annihilation of Caste',
    author: 'Dr. B. R. Ambedkar',
    year: 1936,
    pdBasis: 'Author d. 1956; Public Domain in India since 2017 (60y post-death)',
    source: 'https://archive.org/stream/ambedkar-annihilation-of-castes/ambedkar-annihilation-of-castes_djvu.txt',
    fileName: 'ambedkar-annihilation-of-caste.md',
    wordCountApprox: 36990,
    readingTimeMinutes: 125,
    summary: 'The undelivered 1936 presidential address to the Jat-Pat-Todak Mandal of Lahore, dismantling the socio-religious foundations of the caste system and advocating social democracy.',
    chapters: [
      { id: 'prologue', title: 'Prologue & Historical Correspondence' },
      { id: 'speech-i', title: 'I: Social Reform vs Political Reform' },
      { id: 'speech-ii', title: 'II: Caste Not Merely Division of Labour' },
      { id: 'speech-iv', title: 'IV: Eugenics and Caste Purity Refuted' },
      { id: 'speech-ix', title: 'IX: Castes as Harmful to Social Efficiency' },
      { id: 'speech-xiv', title: 'XIV: The Ideal Society — Liberty, Equality, Fraternity' },
      { id: 'speech-xx', title: 'XX: Destruction of Shastric Authority' },
      { id: 'speech-xxvi', title: 'XXVI: The Danger of Religious Sanctification' }
    ],
    loadContent: () => loadCanonFile('ambedkar-annihilation-of-caste.md', () => import('../../content/canon/ambedkar-annihilation-of-caste.md?raw'))
  },
  gandhi: {
    thinkerId: 'gandhi',
    title: 'Hind Swaraj / Indian Home Rule',
    author: 'Mahatma Gandhi',
    year: 1909,
    pdBasis: 'Author d. 1948; Public Domain in India since 2009 (60y post-death)',
    source: 'https://archive.org/stream/hindswarajorindi00ganduoft/hindswarajorindi00ganduoft_djvu.txt',
    fileName: 'gandhi-hind-swaraj.md',
    wordCountApprox: 32380,
    readingTimeMinutes: 110,
    summary: 'Written aboard the SS Kildonan Castle in 1909, diagnosing the spiritual and moral pathology of modern civilization and formulating the foundational doctrine of Satyagraha.',
    chapters: [
      { id: 'chapter-i', title: 'Chapter I: The Congress and its Officials' },
      { id: 'chapter-iv', title: 'Chapter IV: What is Swaraj?' },
      { id: 'chapter-vi', title: 'Chapter VI: Civilization' },
      { id: 'chapter-xiii', title: 'Chapter XIII: What is True Civilization?' },
      { id: 'chapter-xvi', title: 'Chapter XVI: Brute Force' },
      { id: 'chapter-xvii', title: 'Chapter XVII: Passive Resistance (Satyagraha)' },
      { id: 'chapter-xviii', title: 'Chapter XVIII: Education' },
      { id: 'chapter-xx', title: 'Chapter XX: Conclusion' }
    ],
    loadContent: () => loadCanonFile('gandhi-hind-swaraj.md', () => import('../../content/canon/gandhi-hind-swaraj.md?raw'))
  },
  kant: {
    thinkerId: 'kant',
    title: 'Fundamental Principles of the Metaphysic of Morals',
    author: 'Immanuel Kant (trans. T. K. Abbott)',
    year: 1785,
    pdBasis: 'Author d. 1804 (Trans. 1898); Public Domain worldwide',
    source: 'https://www.gutenberg.org/files/5682/5682-h/5682-h.htm',
    fileName: 'kant-fundamental-principles.md',
    wordCountApprox: 30940,
    readingTimeMinutes: 105,
    summary: 'The foundational exposition of deontological ethics, deducing the Categorical Imperative, the Formula of Humanity, and the Kingdom of Ends.',
    chapters: [
      { id: 'preface', title: 'Preface' },
      { id: 'first-section', title: 'First Section: Transition from Common Rational to Philosophical Moral Cognition' },
      { id: 'second-section', title: 'Second Section: Transition from Popular Moral Philosophy to Metaphysics of Morals' },
      { id: 'categorical-imperative', title: 'The Categorical Imperative & Practical Laws' },
      { id: 'formula-humanity', title: 'The Formula of Humanity as an End in Itself' },
      { id: 'kingdom-ends', title: 'The Autonomy of the Will & Kingdom of Ends' },
      { id: 'third-section', title: 'Third Section: Transition to the Critique of Pure Practical Reason' }
    ],
    loadContent: () => loadCanonFile('kant-fundamental-principles.md', () => import('../../content/canon/kant-fundamental-principles.md?raw'))
  },
  mill: {
    thinkerId: 'mill',
    title: 'On Liberty',
    author: 'John Stuart Mill',
    year: 1859,
    pdBasis: 'Author d. 1873; Public Domain worldwide',
    source: 'https://www.gutenberg.org/ebooks/34901',
    fileName: 'mill-on-liberty.md',
    wordCountApprox: 18500,
    readingTimeMinutes: 65,
    summary: 'The classic defense of individual liberty against state coercion and social tyranny, formulating the Harm Principle and the vital necessity of free expression.',
    chapters: [
      { id: 'chapter-i', title: 'Chapter I: Introductory' },
      { id: 'chapter-ii', title: 'Chapter II: Of the Liberty of Thought and Discussion' },
      { id: 'chapter-iii', title: 'Chapter III: Of Individuality, as One of the Elements of Well-being' },
      { id: 'chapter-iv', title: 'Chapter IV: Of the Limits to the Authority of Society over the Individual' },
      { id: 'chapter-v', title: 'Chapter V: Applications' }
    ],
    loadContent: () => loadCanonFile('mill-on-liberty.md', () => import('../../content/canon/mill-on-liberty.md?raw'))
  },
  kautilya: {
    thinkerId: 'kautilya',
    title: 'Arthashastra',
    author: 'Kautilya (trans. R. Shamasastry)',
    year: -300,
    pdBasis: 'Ancient Sanskrit text c. 300 BCE; Translation 1915; Public Domain worldwide',
    source: 'https://archive.org/details/KautilyaArthashastraR.Shamasastry',
    fileName: 'kautilya-arthashastra.md',
    wordCountApprox: 14200,
    readingTimeMinutes: 50,
    summary: 'The ancient Indian treatise on statecraft, economic policy, administrative intelligence, the Saptanga theory of state, and realistic foreign diplomacy.',
    chapters: [
      { id: 'book-i', title: 'Book I: Concerning Discipline and Duties of the King' },
      { id: 'book-ii', title: 'Book II: The Duties of Government Superintendents & Treasury' },
      { id: 'book-vi', title: 'Book VI: The Source of Sovereign States (Saptanga Theory)' },
      { id: 'book-vii', title: 'Book VII: The Six-Fold Policy (Shadgunya & Mandala Theory)' },
      { id: 'book-viii', title: 'Book VIII: Concerning Vices and Calamities (Vyasanas)' }
    ],
    loadContent: () => loadCanonFile('kautilya-arthashastra.md', () => import('../../content/canon/kautilya-arthashastra.md?raw'))
  },
  aristotle: {
    thinkerId: 'aristotle',
    title: 'Nicomachean Ethics',
    author: 'Aristotle (trans. W. D. Ross)',
    year: -350,
    pdBasis: 'Ancient Greek treatise c. 350 BCE; Translation 1908; Public Domain worldwide',
    source: 'https://www.gutenberg.org/ebooks/8438',
    fileName: 'aristotle-nicomachean-ethics.md',
    wordCountApprox: 16800,
    readingTimeMinutes: 58,
    summary: 'Aristotle’s investigation into the highest human good (Eudaimonia), moral virtue as a golden mean, habituation, practical wisdom (Phronesis), and justice.',
    chapters: [
      { id: 'book-i', title: 'Book I: The Good for Man & Happiness (Eudaimonia)' },
      { id: 'book-ii', title: 'Book II: Moral Virtue and the Doctrine of the Mean' },
      { id: 'book-v', title: 'Book V: Justice — Distributive and Corrective' },
      { id: 'book-vi', title: 'Book VI: Intellectual Virtues & Practical Wisdom (Phronesis)' },
      { id: 'book-viii', title: 'Book VIII: Friendship (Philia)' },
      { id: 'book-x', title: 'Book X: Happiness & The Contemplative Life' }
    ],
    loadContent: () => loadCanonFile('aristotle-nicomachean-ethics.md', () => import('../../content/canon/aristotle-nicomachean-ethics.md?raw'))
  },
  rawls: {
    thinkerId: 'rawls',
    title: 'A Theory of Justice: Foundational Doctrines',
    author: 'John Rawls',
    year: 1971,
    pdBasis: 'Excerpts of fundamental ethical doctrines for non-commercial academic study',
    source: 'Harvard University Press / Canonical Doctrine Compilation',
    fileName: 'rawls-theory-of-justice.md',
    wordCountApprox: 12500,
    readingTimeMinutes: 45,
    summary: 'The landmark revival of social contract theory establishing justice as fairness, the original position behind a veil of ignorance, and the lexical priority of equal basic liberties.',
    chapters: [
      { id: 'sec-1', title: '§1: The Role of Justice' },
      { id: 'sec-3', title: '§3: The Main Idea of the Theory of Justice (The Original Position)' },
      { id: 'sec-11', title: '§11: Two Principles of Justice' },
      { id: 'sec-24', title: '§24: The Veil of Ignorance' },
      { id: 'sec-26', title: '§26: Reasoning Leading to the Two Principles' },
      { id: 'sec-40', title: '§40: The Kantian Interpretation of Justice as Fairness' },
      { id: 'sec-82', title: '§82: The Grounds for the Priority of Liberty' }
    ],
    loadContent: () => loadCanonFile('rawls-theory-of-justice.md', () => import('../../content/canon/rawls-theory-of-justice.md?raw'))
  },
  vivekananda: {
    thinkerId: 'vivekananda',
    title: 'Karma Yoga: The Yoga of Action',
    author: 'Swami Vivekananda',
    year: 1896,
    pdBasis: 'Author d. 1902; Public Domain worldwide',
    source: 'https://archive.org/details/karmayoga00viveuoft',
    fileName: 'vivekananda-karma-yoga.md',
    wordCountApprox: 19800,
    readingTimeMinutes: 70,
    summary: 'Eight lectures delivered in New York in 1895–1896 synthesizing Practical Vedanta with the Bhagavad Gita’s ideal of unattached, selfless work (Nishkama Karma).',
    chapters: [
      { id: 'chap-1', title: 'Chapter I: Karma in Its Effect on Character' },
      { id: 'chap-2', title: 'Chapter II: Each Is Great in His Own Place' },
      { id: 'chap-3', title: 'Chapter III: The Secret of Work' },
      { id: 'chap-4', title: 'Chapter IV: What Is Duty?' },
      { id: 'chap-5', title: 'Chapter V: We Help Ourselves, Not the World' },
      { id: 'chap-6', title: 'Chapter VI: Non-Attachment Is Complete Self-Abnegation' },
      { id: 'chap-7', title: 'Chapter VII: Freedom' },
      { id: 'chap-8', title: 'Chapter VIII: The Ideal of Karma-Yoga' }
    ],
    loadContent: () => loadCanonFile('vivekananda-karma-yoga.md', () => import('../../content/canon/vivekananda-karma-yoga.md?raw'))
  },
  tagore: {
    thinkerId: 'tagore',
    title: 'Nationalism',
    author: 'Rabindranath Tagore',
    year: 1917,
    pdBasis: 'Author d. 1941; Public Domain in India since 2002; Public Domain worldwide',
    source: 'https://www.gutenberg.org/ebooks/40766',
    fileName: 'tagore-nationalism.md',
    wordCountApprox: 13600,
    readingTimeMinutes: 48,
    summary: 'Lectures delivered during the First World War in Japan and the United States, offering a prophetic critique of mechanical nationalism and an appeal to universal humanism.',
    chapters: [
      { id: 'part-i', title: 'I: Nationalism in the West' },
      { id: 'part-ii', title: 'II: Nationalism in Japan' },
      { id: 'part-iii', title: 'III: Nationalism in India' },
      { id: 'part-iv', title: 'IV: The Sunset of the Century' }
    ],
    loadContent: () => loadCanonFile('tagore-nationalism.md', () => import('../../content/canon/tagore-nationalism.md?raw'))
  },
  rousseau: {
    thinkerId: 'rousseau',
    title: 'The Social Contract or Principles of Political Right',
    author: 'Jean-Jacques Rousseau (trans. G. D. H. Cole)',
    year: 1762,
    pdBasis: 'Author d. 1778; Translation 1913; Public Domain worldwide',
    source: 'https://www.gutenberg.org/ebooks/46333',
    fileName: 'rousseau-social-contract.md',
    wordCountApprox: 17500,
    readingTimeMinutes: 60,
    summary: 'The revolutionary manifesto of popular sovereignty, political equality, and the General Will, beginning with the immortal thesis: Man is born free; and everywhere he is in chains.',
    chapters: [
      { id: 'book-i', title: 'Book I: The Social Compact & Foundations of Society' },
      { id: 'book-ii', title: 'Book II: Sovereignty, The General Will, and the Law' },
      { id: 'book-iii', title: 'Book III: Government and its Forms' },
      { id: 'book-iv', title: 'Book IV: The Indestructible General Will & Civil Religion' }
    ],
    loadContent: () => loadCanonFile('rousseau-social-contract.md', () => import('../../content/canon/rousseau-social-contract.md?raw'))
  }
};

export function getCanonOriginalWork(thinkerId: string): CanonWorkMeta | undefined {
  return CANON_ORIGINAL_WORKS[thinkerId];
}
