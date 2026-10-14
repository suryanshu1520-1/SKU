import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { slugify, escapeXml } from './sitemap.js';

function cleanEnvValue(val: any): string {
  if (typeof val !== 'string') return '';
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  return cleaned.trim();
}

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return createClient(cleanEnvValue(url), cleanEnvValue(key));
}

let cachedIndexHtml: string | null = null;

function getBaseHtml(): string {
  if (cachedIndexHtml && process.env.NODE_ENV === 'production') {
    return cachedIndexHtml;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), 'dist', 'index.html'),
    path.resolve(process.cwd(), 'index.html'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        cachedIndexHtml = content;
        return content;
      } catch {
        // ignore and try next
      }
    }
  }

  // Resilient minimal fallback shell if filesystem fails
  return `<!doctype html>
<html lang="en" class="dark bg-neutral-950 text-neutral-50 antialiased">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tark | तर्क — Analytical Test Arena & Daily Intelligence</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="canonical" href="https://www.tark.live/" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

export interface McqRecord {
  id?: string;
  affair_url?: string;
  headline?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  subject?: string;
  edition_date?: string;
}

export interface ArticleRecord {
  id?: string;
  source: string;
  ministry: string;
  headline: string;
  url: string;
  created_at?: string;
  published_at?: string;
  summary: {
    bullets?: string[];
    prelims?: string;
    mains?: string;
    tags?: string[];
    grounding?: number;
    static_linkages?: { concept: string; textbook_context: string }[];
  };
  mcq?: McqRecord | null;
}

export async function fetchArticleForSeo(
  pathname: string,
  queryId?: string
): Promise<ArticleRecord | null> {
  const cleanPath = pathname.replace(/^\/+/, '');
  const segments = cleanPath.split('/');

  // 1. Check PRS Vault first if path is /prs/:id or queryId starts with prs-
  const isPrs = segments[0] === 'prs' || (queryId && queryId.startsWith('prs-'));
  if (isPrs) {
    try {
      const targetId = queryId || segments[1] || '';
      const prsPath = path.resolve(process.cwd(), 'src/data/prs-vault-dossiers.json');
      if (fs.existsSync(prsPath)) {
        const prsRaw = fs.readFileSync(prsPath, 'utf-8');
        const prsItems: ArticleRecord[] = JSON.parse(prsRaw);
        const matched = prsItems.find(
          (it) => it.id === targetId || slugify(it.headline) === targetId || slugify(it.id || '') === targetId
        );
        if (matched) return matched;
      }
    } catch (err) {
      console.warn('[bot-renderer] PRS dossier lookup error:', err);
    }
  }

  // 2. Query Supabase current_affairs
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    let article: ArticleRecord | null = null;

    if (queryId) {
      const { data, error } = await supabase
        .from('current_affairs')
        .select('*')
        .eq('id', queryId)
        .maybeSingle();

      if (!error && data) article = data as ArticleRecord;
    }

    if (!article) {
      // Try matching slug or headline
      const slug = segments[1] || '';
      if (slug) {
        // If slug contains an appended UUID (e.g. some-slug--uuid)
        const uuidMatch = slug.match(/--([0-9a-f-]{36})$/i);
        if (uuidMatch) {
          const { data, error } = await supabase
            .from('current_affairs')
            .select('*')
            .eq('id', uuidMatch[1])
            .maybeSingle();
          if (!error && data) article = data as ArticleRecord;
        }

        if (!article) {
          // Try looking up recent records to find match
          const { data, error } = await supabase
            .from('current_affairs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(250);

          if (!error && data) {
            const matched = data.find((d: any) => slugify(d.headline) === slug);
            if (matched) article = matched as ArticleRecord;
          }
        }
      }
    }

    // If article found, attempt to link associated MCQ from current_affairs_mcqs
    if (article) {
      try {
        let mcqFound: McqRecord | null = null;
        if (article.url) {
          const { data } = await supabase
            .from('current_affairs_mcqs')
            .select('*')
            .eq('affair_url', article.url)
            .maybeSingle();
          if (data) mcqFound = data as McqRecord;
        }
        if (!mcqFound && article.headline) {
          const { data } = await supabase
            .from('current_affairs_mcqs')
            .select('*')
            .eq('headline', article.headline)
            .maybeSingle();
          if (data) mcqFound = data as McqRecord;
        }
        if (!mcqFound) {
          // Fallback to recent relevant MCQ
          const { data } = await supabase
            .from('current_affairs_mcqs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
          if (data && data[0]) mcqFound = data[0] as McqRecord;
        }
        if (mcqFound) {
          article.mcq = mcqFound;
        }
      } catch (mcqErr) {
        console.warn('[bot-renderer] MCQ lookup warning:', mcqErr);
      }
      return article;
    }
  } catch (err) {
    console.warn('[bot-renderer] Supabase fetch error:', err);
  }

  return null;
}

/**
 * Builds Schema.org Quiz & Question structured data for Google Search rich results.
 */
function buildQuizSchema(mcqs: McqRecord[], pageUrl: string, quizName = 'UPSC Current Affairs Prelims Quiz') {
  if (!mcqs || mcqs.length === 0) return null;

  return {
    '@type': 'Quiz',
    '@id': `${pageUrl}#quiz`,
    'name': quizName,
    'description': 'High-yield UPSC Civil Services Prelims analytical question derived from official government intelligence notifications.',
    'educationalLevel': 'advanced',
    'assesses': 'UPSC Civil Services Examination (GS Prelims)',
    'hasPart': mcqs.map((mcq, idx) => {
      const options = Array.isArray(mcq.options) ? mcq.options : [];
      const correctIdx = typeof mcq.correct_index === 'number' ? mcq.correct_index : 0;
      const acceptedOptText = options[correctIdx] || options[0] || 'Correct Option';

      return {
        '@type': 'Question',
        'name': mcq.question,
        'position': idx + 1,
        'educationalAlignment': [
          {
            '@type': 'AlignmentObject',
            'alignmentType': 'educationalSubject',
            'targetName': mcq.subject || 'General Studies',
          },
        ],
        'suggestedAnswer': options
          .map((opt, optIdx) => ({
            '@type': 'Answer',
            'position': optIdx + 1,
            'text': opt,
          }))
          .filter((_, optIdx) => optIdx !== correctIdx),
        'acceptedAnswer': {
          '@type': 'Answer',
          'position': correctIdx + 1,
          'text': acceptedOptText,
          'comment': {
            '@type': 'Comment',
            'text': mcq.explanation || 'Official Tark analytical rationale aligned with UPSC Prelims standards.',
          },
        },
      };
    }),
  };
}

/**
 * Renders an accessible, pre-rendered semantic HTML block for an MCQ.
 */
function renderMcqHtml(mcq: McqRecord): string {
  const options = Array.isArray(mcq.options) ? mcq.options : [];
  const correctIdx = typeof mcq.correct_index === 'number' ? mcq.correct_index : 0;
  const letters = ['A', 'B', 'C', 'D'];

  const optionsList = options.map((opt, idx) => {
    const letter = letters[idx] || String(idx + 1);
    return `
      <li class="flex items-start gap-2.5 p-2 rounded bg-slate-900/60 border border-slate-800 text-slate-200">
        <span class="font-mono text-xs font-bold text-amber-300 w-5 text-right">[${letter}]</span>
        <span class="text-xs sm:text-sm">${escapeXml(opt)}</span>
      </li>
    `;
  }).join('');

  return `
    <section class="upsc-mcq-drill bg-slate-900/90 border border-amber-500/40 rounded-lg p-4 sm:p-5 mb-8 shadow-lg">
      <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <h2 class="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
            🎯 UPSC Prelims Practice Drill
          </h2>
        </div>
        <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          ${escapeXml(mcq.subject || 'General Studies')}
        </span>
      </div>

      <p class="text-sm sm:text-base font-serif text-slate-100 font-medium leading-relaxed mb-4">
        ${escapeXml(mcq.question)}
      </p>

      <ul class="space-y-2 mb-4">
        ${optionsList}
      </ul>

      <details class="bg-slate-950/90 border border-slate-800 rounded p-3 mb-4 text-xs text-slate-300">
        <summary class="cursor-pointer font-mono text-amber-300 font-semibold select-none hover:text-amber-200">
          ▶ Reveal Official Answer & Analytical Explanation
        </summary>
        <div class="mt-3 pt-3 border-t border-slate-800/80 leading-relaxed text-slate-200">
          <div class="font-mono text-xs text-emerald-400 font-bold mb-1">
            ✓ Correct Option: [${letters[correctIdx] || 'A'}] ${escapeXml(options[correctIdx] || '')}
          </div>
          <p class="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
            ${escapeXml(mcq.explanation || '')}
          </p>
        </div>
      </details>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
        <span class="text-slate-400">Tark High-Yield Question Bank</span>
        <a href="/arena" class="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded hover:bg-amber-500/20 hover:text-amber-200 transition-colors">
          ⚡ Practice Full Test in Testing Arena ↗
        </a>
      </div>
    </section>
  `;
}

export function renderSeoHtml(article: ArticleRecord, reqUrl: string): string {
  const baseHtml = getBaseHtml();
  const slug = slugify(article.headline);
  const canonicalUrl = `https://www.tark.live/intelligence/${slug}?id=${encodeURIComponent(article.id || '')}`;
  const pageTitle = `${article.headline} — UPSC Policy Intelligence & Prelims Analysis | Tark`;

  const bullets = article.summary?.bullets || [];
  const rawDesc = bullets.slice(0, 2).join(' ') || article.summary?.prelims || article.headline;
  const cleanDesc = rawDesc.replace(/[<>"']/g, '').slice(0, 220);

  const publishedIso = new Date(article.published_at || article.created_at || Date.now()).toISOString();
  const modifiedIso = publishedIso;

  const graphElements: any[] = [
    {
      '@type': 'NewsArticle',
      '@id': `${canonicalUrl}#article`,
      'isPartOf': {
        '@type': 'WebSite',
        '@id': 'https://www.tark.live/#website',
        'name': 'Tark | तर्क',
        'url': 'https://www.tark.live/'
      },
      'headline': article.headline,
      'description': cleanDesc,
      'datePublished': publishedIso,
      'dateModified': modifiedIso,
      'mainEntityOfPage': canonicalUrl,
      'url': canonicalUrl,
      'articleSection': `UPSC Current Affairs — ${article.ministry || 'Governance'}`,
      'inLanguage': 'en-IN',
      'author': {
        '@type': 'Organization',
        'name': 'Tark Intelligence Bureau',
        'url': 'https://www.tark.live/'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Tark',
        'url': 'https://www.tark.live/',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://www.tark.live/favicon.svg'
        }
      },
      'keywords': [
        'UPSC Current Affairs',
        'PIB Summary',
        article.ministry,
        'Civil Services Examination',
        'UPSC Prelims',
        'UPSC Mains'
      ].filter(Boolean)
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': 'https://www.tark.live/'
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': 'Daily Intelligence',
          'item': 'https://www.tark.live/intelligence'
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': article.ministry || 'Policy',
          'item': canonicalUrl
        }
      ]
    }
  ];

  // If associated MCQ exists, append Schema.org Quiz
  if (article.mcq) {
    const quizSchema = buildQuizSchema([article.mcq], canonicalUrl, `Prelims Drill: ${article.headline}`);
    if (quizSchema) graphElements.push(quizSchema);
  }

  const schemaJson = {
    '@context': 'https://schema.org',
    '@graph': graphElements
  };

  // Pre-rendered Semantic HTML Body
  const semanticArticleHtml = `
    <article class="max-w-4xl mx-auto px-4 py-8 text-neutral-100 font-sans" data-ssr="true">
      <header class="border-b border-slate-800 pb-5 mb-6">
        <div class="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#e0d0ab] mb-2">
          <span>${escapeXml(article.source || 'WIRE')}</span>
          <span>·</span>
          <span>${escapeXml(article.ministry || 'General Policy')}</span>
          <span>·</span>
          <time datetime="${publishedIso}">${publishedIso.split('T')[0]}</time>
        </div>
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white leading-tight">
          ${escapeXml(article.headline)}
        </h1>
      </header>

      <section class="summary mb-8">
        <h2 class="text-sm font-mono uppercase tracking-wider text-slate-400 mb-3">Distilled Policy Brief</h2>
        <ul class="space-y-2.5 text-sm sm:text-base text-slate-200 leading-relaxed list-disc list-inside">
          ${bullets.map((b) => `<li>${escapeXml(b)}</li>`).join('\n')}
        </ul>
      </section>

      ${article.summary?.prelims ? `
      <section class="prelims-hook bg-slate-900/80 border border-slate-700/80 rounded p-4 sm:p-5 mb-6">
        <h2 class="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold mb-2">
          🎯 Prelims High-Yield Examination Points
        </h2>
        <p class="text-sm text-slate-300 leading-relaxed">${escapeXml(article.summary.prelims)}</p>
      </section>` : ''}

      ${article.summary?.mains ? `
      <section class="mains-hook bg-slate-900/80 border border-slate-700/80 rounded p-4 sm:p-5 mb-6">
        <h2 class="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold mb-2">
          ⚖️ Mains Analytical & Syllabus Linkages
        </h2>
        <p class="text-sm text-slate-300 leading-relaxed">${escapeXml(article.summary.mains)}</p>
      </section>` : ''}

      ${article.mcq ? renderMcqHtml(article.mcq) : ''}

      ${article.summary?.static_linkages && article.summary.static_linkages.length > 0 ? `
      <section class="static-linkages bg-slate-900/60 border border-slate-800 rounded p-4 mb-6">
        <h2 class="text-xs font-mono uppercase tracking-wider text-purple-300 font-bold mb-2">
          📚 Static Syllabus & Constitutional Linkages
        </h2>
        <div class="space-y-2">
          ${article.summary.static_linkages.map((sl) => `
            <div class="text-xs text-slate-300">
              <span class="font-bold text-[#e0d0ab]">${escapeXml(sl.concept)}:</span> ${escapeXml(sl.textbook_context)}
            </div>
          `).join('')}
        </div>
      </section>` : ''}

      <footer class="pt-4 border-t border-slate-800 text-xs text-slate-500 font-mono flex items-center justify-between">
        <span>Verified by Tark Intelligence Bureau</span>
        <a href="${escapeXml(article.url || 'https://www.tark.live')}" rel="nofollow noopener" target="_blank" class="text-[#e0d0ab] hover:underline">
          Original Wire Source ↗
        </a>
      </footer>

      <nav class="pt-4 mt-4 border-t border-slate-800/60 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
        <a href="/intelligence" class="text-[#e0d0ab] hover:underline">← All Policy Signals</a>
        <a href="/intelligence/gs-1" class="hover:text-slate-200 hover:underline">GS-1 Hub</a>
        <a href="/intelligence/gs-2" class="hover:text-slate-200 hover:underline">GS-2 Hub</a>
        <a href="/intelligence/gs-3" class="hover:text-slate-200 hover:underline">GS-3 Hub</a>
        <a href="/intelligence/gs-4" class="hover:text-slate-200 hover:underline">GS-4 Hub</a>
        <a href="/daily-edition" class="hover:text-slate-200 hover:underline">Daily PIB Edition</a>
        <a href="/prs" class="hover:text-slate-200 hover:underline">PRS Legislative Vault</a>
        <a href="/arena" class="hover:text-slate-200 hover:underline">Practice Test Arena</a>
      </nav>
    </article>
  `;

  // Inject meta tags and replace title
  let modifiedHtml = baseHtml;

  modifiedHtml = modifiedHtml.replace(
    /<title>.*?<\/title>/i,
    `<title>${escapeXml(pageTitle)}</title>`
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${escapeXml(cleanDesc)}" />`
  );

  if (modifiedHtml.includes('<link rel="canonical"')) {
    modifiedHtml = modifiedHtml.replace(
      /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
      `<link rel="canonical" href="${escapeXml(canonicalUrl)}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      '</head>',
      `  <link rel="canonical" href="${escapeXml(canonicalUrl)}" />\n</head>`
    );
  }

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:title" content="${escapeXml(pageTitle)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:description" content="${escapeXml(cleanDesc)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:url" content="${escapeXml(canonicalUrl)}" />`
  );

  const extraHead = `
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="${publishedIso}" />
    <meta property="article:modified_time" content="${modifiedIso}" />
    <meta property="article:section" content="${escapeXml(article.ministry || 'Governance')}" />
    <meta name="twitter:title" content="${escapeXml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeXml(cleanDesc)}" />
    <script type="application/ld+json">
      ${JSON.stringify(schemaJson)}
    </script>
  `;

  modifiedHtml = modifiedHtml.replace('</head>', `${extraHead}\n</head>`);

  modifiedHtml = modifiedHtml.replace(
    /<div\s+id=["']root["']>[\s\S]*?<\/div>/i,
    `<div id="root">${semanticArticleHtml}</div>`
  );

  return modifiedHtml;
}

/**
 * GS Syllabus Paper Definitions
 */
const GS_PAPERS: Record<string, {
  name: string;
  roman: string;
  title: string;
  description: string;
  syllabusTopics: string[];
  ministries: string[];
  keywords: string[];
}> = {
  'gs-1': {
    name: 'General Studies Paper I',
    roman: 'GS-I',
    title: 'UPSC GS 1 Current Affairs & Static Linkages | Heritage, Geography & Society | Tark',
    description: 'High-yield current affairs dossiers and Prelims MCQs mapped strictly to UPSC GS-1 syllabus: Indian Heritage, Modern History, Geography, and Social Demographics.',
    syllabusTopics: [
      'Indian Heritage, Culture & Architecture',
      'Modern Indian History & Freedom Struggle',
      'World History & Decolonization',
      'Physical, Human & Economic Geography',
      'Indian Society, Diversity & Urbanization'
    ],
    ministries: ['Ministry of Culture', 'Ministry of Tourism', 'Ministry of Earth Sciences', 'Ministry of Tribal Affairs', 'Ministry of Social Justice and Empowerment'],
    keywords: ['Culture', 'Heritage', 'History', 'Geography', 'Earth Sciences', 'Monsoon', 'Cyclone', 'Society', 'Demographics', 'Urbanization']
  },
  'gs-2': {
    name: 'General Studies Paper II',
    roman: 'GS-II',
    title: 'UPSC GS 2 Current Affairs, Polity & Governance | Constitution, Bills & IR | Tark',
    description: 'Comprehensive policy intelligence and Prelims MCQs mapped to UPSC GS-2: Indian Constitution, Parliament, Federalism, Statutory Bodies, Social Justice, and International Relations.',
    syllabusTopics: [
      'Indian Constitution, Basic Structure & Amendments',
      'Parliamentary Functioning, Bills & Acts',
      'Judiciary, Judicial Review & Doctrine of Proportionality',
      'E-Governance, Transparency & Citizen Charters',
      'International Relations, Bilateral Treaties & Multilateral Forums'
    ],
    ministries: ['Ministry of Law and Justice', 'Ministry of External Affairs', 'Ministry of Home Affairs', 'Parliamentary Affairs', 'Ministry of Personnel, Public Grievances and Pensions'],
    keywords: ['Constitution', 'Polity', 'Parliament', 'Judiciary', 'Supreme Court', 'High Court', 'Governance', 'Federalism', 'International Relations', 'Foreign Affairs', 'Bilateral', 'Treaty']
  },
  'gs-3': {
    name: 'General Studies Paper III',
    roman: 'GS-III',
    title: 'UPSC GS 3 Current Affairs | Economy, Sci-Tech, Environment & Security | Tark',
    description: 'Analytical coverage and Prelims practice MCQs mapped to UPSC GS-3: Indian Economy, Agriculture, Science & Tech, Biodiversity, Climate Policy, and Internal Security.',
    syllabusTopics: [
      'Indian Economy, Fiscal Policy & RBI Regulatory Frameworks',
      'Agriculture, MSP, Food Processing & Irrigation',
      'Science, Technology, AI & Space Exploration',
      'Environment, Ecology, Pollution & COP Climate Treaties',
      'Internal Security, Border Management, Cyber Defense & Money Laundering'
    ],
    ministries: ['Ministry of Finance', 'Reserve Bank of India', 'Ministry of Commerce & Industry', 'Ministry of Agriculture & Farmers Welfare', 'Ministry of Electronics & IT', 'Ministry of Defence', 'Ministry of Environment, Forest and Climate Change', 'Ministry of Power', 'Ministry of Science & Technology'],
    keywords: ['Economy', 'RBI', 'Inflation', 'GDP', 'Agriculture', 'MSP', 'Science', 'Technology', 'AI', 'Space', 'ISRO', 'Defence', 'Security', 'Cyber', 'Environment', 'Climate', 'Forest']
  },
  'gs-4': {
    name: 'General Studies Paper IV',
    roman: 'GS-IV',
    title: 'UPSC GS 4 Ethics, Integrity & Aptitude Current Affairs | Case Studies | Tark',
    description: 'Ethical analysis, administrative dilemmas, and civil service values applied to contemporary governance events for UPSC GS-4 Ethics & Case Studies.',
    syllabusTopics: [
      'Ethics & Human Interface in Governance',
      'Attitude, Moral & Political Perspectives',
      'Foundational Values for Civil Service & Probity',
      'Emotional Intelligence in Administration',
      'Ethical Case Studies & Dilemmas in Public Service'
    ],
    ministries: ['Ministry of Personnel, Public Grievances and Pensions', 'Cabinet Secretariat', 'NITI Aayog'],
    keywords: ['Ethics', 'Integrity', 'Aptitude', 'Probity', 'Corruption', 'Transparency', 'Accountability', 'Whistleblower', 'Dilemma', 'Administrative Reform']
  }
};

/**
 * Programmatic GS Paper Syllabus Hub Pre-Renderer (/intelligence/gs-1, /intelligence/gs-2, etc.)
 */
export async function renderGsHubSeoHtml(rawPaper: string): Promise<string> {
  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

  // Normalize gs-1, gs-i, 1, gs-2, etc.
  const normKey = rawPaper.toLowerCase().replace('gs-', '').replace('gs', '');
  let paperKey = 'gs-1';
  if (normKey === '2' || normKey === 'ii') paperKey = 'gs-2';
  else if (normKey === '3' || normKey === 'iii') paperKey = 'gs-3';
  else if (normKey === '4' || normKey === 'iv') paperKey = 'gs-4';

  const meta = GS_PAPERS[paperKey] || GS_PAPERS['gs-1'];
  const canonicalUrl = `https://www.tark.live/intelligence/${paperKey}`;

  let articles: any[] = [];
  let mcqs: McqRecord[] = [];

  if (supabase) {
    try {
      // 1. Fetch recent articles
      const { data: rawArticles } = await supabase
        .from('current_affairs')
        .select('id, headline, source, ministry, summary, created_at, published_at')
        .neq('source', 'PIB_Digest')
        .order('created_at', { ascending: false })
        .limit(150);

      if (rawArticles) {
        // Filter articles matching GS paper keywords, tags or ministries
        articles = rawArticles.filter((art: any) => {
          const min = (art.ministry || '').toLowerCase();
          const headline = (art.headline || '').toLowerCase();
          const tags = Array.isArray(art.summary?.tags) ? art.summary.tags.join(' ').toLowerCase() : '';
          const mains = (art.summary?.mains || '').toLowerCase();

          // Check if explicit tag matches
          if (tags.includes(paperKey) || tags.includes(meta.roman.toLowerCase())) return true;

          // Check ministries
          if (meta.ministries.some(m => min.includes(m.toLowerCase()))) return true;

          // Check keywords
          if (meta.keywords.some(k => headline.includes(k.toLowerCase()) || mains.includes(k.toLowerCase()))) return true;

          return false;
        }).slice(0, 25);
      }

      // 2. Fetch MCQs for this subject
      const { data: rawMcqs } = await supabase
        .from('current_affairs_mcqs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (rawMcqs) {
        mcqs = rawMcqs.filter((m: any) => {
          const sub = (m.subject || '').toLowerCase();
          const q = (m.question || '').toLowerCase();
          return meta.keywords.some(k => sub.includes(k.toLowerCase()) || q.includes(k.toLowerCase()));
        }).slice(0, 3) as McqRecord[];

        if (mcqs.length === 0 && rawMcqs.length > 0) {
          mcqs = rawMcqs.slice(0, 2) as McqRecord[];
        }
      }
    } catch (err) {
      console.warn(`[bot-renderer] Failed to fetch GS hub data for ${paperKey}:`, err);
    }
  }

  // Schema Graph
  const graphElements: any[] = [
    {
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#collection`,
      'name': meta.title,
      'description': meta.description,
      'url': canonicalUrl,
      'isPartOf': {
        '@type': 'WebSite',
        '@id': 'https://www.tark.live/#website',
        'name': 'Tark | तर्क',
        'url': 'https://www.tark.live/'
      }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.tark.live/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Daily Intelligence', 'item': 'https://www.tark.live/intelligence' },
        { '@type': 'ListItem', 'position': 3, 'name': meta.roman, 'item': canonicalUrl }
      ]
    }
  ];

  if (articles.length > 0) {
    graphElements.push({
      '@type': 'ItemList',
      '@id': `${canonicalUrl}#itemlist`,
      'itemListElement': articles.slice(0, 15).map((art, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'url': `https://www.tark.live/intelligence/${slugify(art.headline)}?id=${encodeURIComponent(art.id)}`,
        'name': art.headline
      }))
    });
  }

  if (mcqs.length > 0) {
    const quiz = buildQuizSchema(mcqs, canonicalUrl, `UPSC ${meta.roman} Topic Practice Quiz`);
    if (quiz) graphElements.push(quiz);
  }

  const articlesHtml = articles.map((art) => {
    const slug = slugify(art.headline);
    const artUrl = `/intelligence/${slug}?id=${encodeURIComponent(art.id)}`;
    const bullets = Array.isArray(art.summary?.bullets) ? art.summary.bullets.slice(0, 2) : [];
    return `
      <li class="p-4 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
        <div class="flex items-center gap-2 text-xs font-mono uppercase text-[#e0d0ab] mb-1.5">
          <span>${escapeXml(art.source || 'WIRE')}</span>
          <span>·</span>
          <span>${escapeXml(art.ministry || 'Policy')}</span>
        </div>
        <h2 class="text-base sm:text-lg font-serif font-bold text-white mb-2">
          <a href="${artUrl}" class="hover:text-amber-300 hover:underline transition-colors">${escapeXml(art.headline)}</a>
        </h2>
        ${bullets.length > 0 ? `
          <ul class="text-xs sm:text-sm text-slate-300 space-y-1 list-disc list-inside mb-3">
            ${bullets.map((b: string) => `<li>${escapeXml(b)}</li>`).join('')}
          </ul>
        ` : ''}
        <div class="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80">
          <a href="${artUrl}" class="text-amber-300 hover:underline font-semibold">Read High-Yield Brief & Pointers →</a>
          <a href="/arena" class="hover:text-slate-200">Practice in Arena ↗</a>
        </div>
      </li>
    `;
  }).join('');

  const syllabusHtml = meta.syllabusTopics.map((top) => `
    <li class="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/40 border border-slate-800 px-3 py-1.5 rounded">
      <span class="text-amber-400 font-bold">§</span>
      <span>${escapeXml(top)}</span>
    </li>
  `).join('');

  const mcqsHtml = mcqs.length > 0 ? `
    <div class="mb-8">
      <h2 class="text-sm font-mono uppercase tracking-wider text-amber-300 font-bold mb-3">
        ⚡ High-Yield Practice Questions (${meta.roman})
      </h2>
      ${mcqs.map((m) => renderMcqHtml(m)).join('')}
    </div>
  ` : '';

  const semanticHtml = `
    <main class="max-w-4xl mx-auto px-4 py-8 text-neutral-100 font-sans" data-ssr="true">
      <header class="border-b border-slate-800 pb-5 mb-6">
        <nav class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
          <a href="/" class="hover:text-slate-200">Home</a>
          <span>/</span>
          <a href="/intelligence" class="hover:text-slate-200">Intelligence</a>
          <span>/</span>
          <span class="text-amber-300 font-bold">${meta.roman}</span>
        </nav>
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white mb-2">
          ${escapeXml(meta.name)} (${meta.roman})
        </h1>
        <p class="text-sm sm:text-base text-slate-300 leading-relaxed mb-4">
          ${escapeXml(meta.description)}
        </p>

        <div class="mt-4 pt-4 border-t border-slate-800">
          <h2 class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Core Syllabus Dimensions Covered:</h2>
          <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${syllabusHtml}
          </ul>
        </div>
      </header>

      ${mcqsHtml}

      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-serif font-bold text-white">Recent ${meta.roman} Current Affairs & Policy Briefs</h2>
          <span class="text-xs font-mono text-slate-400">${articles.length} Dossiers</span>
        </div>
        <ul class="space-y-4">
          ${articlesHtml || '<li class="text-sm text-slate-400">Loading verified policy signals...</li>'}
        </ul>
      </section>

      <nav class="pt-8 mt-8 border-t border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
        <a href="/intelligence" class="text-amber-300 hover:underline">← All Intelligence</a>
        <a href="/intelligence/gs-1" class="${paperKey === 'gs-1' ? 'text-amber-300 font-bold' : 'hover:text-slate-200'}">GS-1 Hub</a>
        <a href="/intelligence/gs-2" class="${paperKey === 'gs-2' ? 'text-amber-300 font-bold' : 'hover:text-slate-200'}">GS-2 Hub</a>
        <a href="/intelligence/gs-3" class="${paperKey === 'gs-3' ? 'text-amber-300 font-bold' : 'hover:text-slate-200'}">GS-3 Hub</a>
        <a href="/intelligence/gs-4" class="${paperKey === 'gs-4' ? 'text-amber-300 font-bold' : 'hover:text-slate-200'}">GS-4 Hub</a>
        <a href="/arena" class="hover:text-slate-200">Practice Arena</a>
      </nav>
    </main>
  `;

  let modifiedHtml = baseHtml;
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(meta.title)}</title>`);
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${escapeXml(meta.description)}" />`
  );

  if (modifiedHtml.includes('<link rel="canonical"')) {
    modifiedHtml = modifiedHtml.replace(
      /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
      `<link rel="canonical" href="${escapeXml(canonicalUrl)}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  <link rel="canonical" href="${escapeXml(canonicalUrl)}" />\n</head>`);
  }

  const extraHead = `
    <script type="application/ld+json">
      ${JSON.stringify({ '@context': 'https://schema.org', '@graph': graphElements })}
    </script>
  `;
  modifiedHtml = modifiedHtml.replace('</head>', `${extraHead}\n</head>`);

  modifiedHtml = modifiedHtml.replace(
    /<div\s+id=["']root["']>[\s\S]*?<\/div>/i,
    `<div id="root">${semanticHtml}</div>`
  );

  return modifiedHtml;
}

/**
 * Programmatic Ministry Hub Pre-Renderer (/intelligence/ministry/:slug)
 */
export async function renderMinistryHubSeoHtml(slug: string): Promise<string> {
  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

  const formattedName = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bAnd\b/g, '&');

  const title = `${formattedName} PIB Policy Briefs & UPSC Current Affairs | Tark`;
  const description = `Official policy releases, schemes, circulars, and Prelims practice questions from ${formattedName} distilled for UPSC Civil Services Examination.`;
  const canonicalUrl = `https://www.tark.live/intelligence/ministry/${slugify(slug)}`;

  let articles: any[] = [];
  let mcqs: McqRecord[] = [];

  if (supabase) {
    try {
      // Query articles where ministry loosely matches
      const keywords = slug.split('-').filter(w => !['ministry', 'of', 'and', 'the', 'for'].includes(w));
      const searchKey = keywords[0] || slug;

      const { data: rawArticles } = await supabase
        .from('current_affairs')
        .select('id, headline, source, ministry, summary, created_at, published_at')
        .ilike('ministry', `%${searchKey}%`)
        .order('created_at', { ascending: false })
        .limit(30);

      if (rawArticles && rawArticles.length > 0) {
        articles = rawArticles;
      }

      // Query MCQs for this subject
      const { data: rawMcqs } = await supabase
        .from('current_affairs_mcqs')
        .select('*')
        .or(`question.ilike.%${searchKey}%,subject.ilike.%${searchKey}%`)
        .limit(2);

      if (rawMcqs) {
        mcqs = rawMcqs as McqRecord[];
      }
    } catch (err) {
      console.warn(`[bot-renderer] Failed to fetch ministry hub for ${slug}:`, err);
    }
  }

  const graphElements: any[] = [
    {
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#collection`,
      'name': title,
      'description': description,
      'url': canonicalUrl,
      'isPartOf': {
        '@type': 'WebSite',
        '@id': 'https://www.tark.live/#website',
        'name': 'Tark | तर्क',
        'url': 'https://www.tark.live/'
      }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.tark.live/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Intelligence', 'item': 'https://www.tark.live/intelligence' },
        { '@type': 'ListItem', 'position': 3, 'name': formattedName, 'item': canonicalUrl }
      ]
    }
  ];

  if (articles.length > 0) {
    graphElements.push({
      '@type': 'ItemList',
      '@id': `${canonicalUrl}#itemlist`,
      'itemListElement': articles.slice(0, 15).map((art, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'url': `https://www.tark.live/intelligence/${slugify(art.headline)}?id=${encodeURIComponent(art.id)}`,
        'name': art.headline
      }))
    });
  }

  if (mcqs.length > 0) {
    const quiz = buildQuizSchema(mcqs, canonicalUrl, `${formattedName} Prelims Quiz`);
    if (quiz) graphElements.push(quiz);
  }

  const articlesHtml = articles.map((art) => {
    const artSlug = slugify(art.headline);
    const artUrl = `/intelligence/${artSlug}?id=${encodeURIComponent(art.id)}`;
    const bullets = Array.isArray(art.summary?.bullets) ? art.summary.bullets.slice(0, 2) : [];
    return `
      <li class="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
        <span class="text-xs font-mono uppercase text-[#e0d0ab]">${escapeXml(art.source || 'PIB')}</span>
        <h2 class="text-base sm:text-lg font-serif font-bold text-white my-1">
          <a href="${artUrl}" class="hover:text-amber-300 hover:underline">${escapeXml(art.headline)}</a>
        </h2>
        ${bullets.length > 0 ? `
          <ul class="text-xs sm:text-sm text-slate-300 space-y-1 list-disc list-inside mb-2">
            ${bullets.map((b: string) => `<li>${escapeXml(b)}</li>`).join('')}
          </ul>
        ` : ''}
        <div class="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80">
          <a href="${artUrl}" class="text-amber-300 hover:underline">Read Analysis & Prelims Pointers →</a>
          <a href="/arena" class="hover:text-slate-200">Practice in Arena ↗</a>
        </div>
      </li>
    `;
  }).join('');

  const mcqsHtml = mcqs.length > 0 ? `
    <div class="mb-8">
      <h2 class="text-sm font-mono uppercase tracking-wider text-amber-300 font-bold mb-3">
        🎯 ${escapeXml(formattedName)} UPSC Practice Questions
      </h2>
      ${mcqs.map((m) => renderMcqHtml(m)).join('')}
    </div>
  ` : '';

  const semanticHtml = `
    <main class="max-w-4xl mx-auto px-4 py-8 text-neutral-100 font-sans" data-ssr="true">
      <header class="border-b border-slate-800 pb-5 mb-6">
        <nav class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
          <a href="/" class="hover:text-slate-200">Home</a>
          <span>/</span>
          <a href="/intelligence" class="hover:text-slate-200">Intelligence</a>
          <span>/</span>
          <span class="text-amber-300 font-bold">${escapeXml(formattedName)}</span>
        </nav>
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white mb-2">
          ${escapeXml(formattedName)}
        </h1>
        <p class="text-sm text-slate-300 leading-relaxed">
          ${escapeXml(description)}
        </p>
      </header>

      ${mcqsHtml}

      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-serif font-bold text-white">Official Policy Notifications & Dossiers</h2>
          <span class="text-xs font-mono text-slate-400">${articles.length} Briefs</span>
        </div>
        <ul class="space-y-4">
          ${articlesHtml || '<li class="text-sm text-slate-400">No policy briefs found for this ministry yet.</li>'}
        </ul>
      </section>

      <nav class="pt-8 mt-8 border-t border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
        <a href="/intelligence" class="text-amber-300 hover:underline">← All Policy Signals</a>
        <a href="/daily-edition" class="hover:text-slate-200">Daily PIB Edition</a>
        <a href="/prs" class="hover:text-slate-200">PRS Legislative Vault</a>
        <a href="/arena" class="hover:text-slate-200">Practice Test Arena</a>
      </nav>
    </main>
  `;

  let modifiedHtml = baseHtml;
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(title)}</title>`);
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${escapeXml(description)}" />`
  );

  if (modifiedHtml.includes('<link rel="canonical"')) {
    modifiedHtml = modifiedHtml.replace(
      /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
      `<link rel="canonical" href="${escapeXml(canonicalUrl)}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  <link rel="canonical" href="${escapeXml(canonicalUrl)}" />\n</head>`);
  }

  const extraHead = `
    <script type="application/ld+json">
      ${JSON.stringify({ '@context': 'https://schema.org', '@graph': graphElements })}
    </script>
  `;
  modifiedHtml = modifiedHtml.replace('</head>', `${extraHead}\n</head>`);

  modifiedHtml = modifiedHtml.replace(
    /<div\s+id=["']root["']>[\s\S]*?<\/div>/i,
    `<div id="root">${semanticHtml}</div>`
  );

  return modifiedHtml;
}

/**
 * Daily Edition Archive SSR Pre-Renderer (/daily-edition/:date or /daily-edition)
 */
export async function renderDailyEditionSeoHtml(dateStr?: string): Promise<string> {
  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

  let targetDate = dateStr || '';
  let digest: any = null;
  let articles: any[] = [];
  let mcqs: McqRecord[] = [];

  if (supabase) {
    try {
      if (targetDate) {
        const { data: dData } = await supabase
          .from('pib_digests')
          .select('*')
          .eq('date', targetDate)
          .maybeSingle();
        if (dData) digest = dData;
      }

      if (!digest) {
        const { data: dData } = await supabase
          .from('pib_digests')
          .select('*')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (dData) {
          digest = dData;
          targetDate = dData.date;
        }
      }

      if (targetDate) {
        // Query articles matching that date
        const { data: aData } = await supabase
          .from('current_affairs')
          .select('id, headline, source, ministry, summary, created_at, published_at')
          .or(`created_at.like.${targetDate}%,published_at.like.${targetDate}%`)
          .order('created_at', { ascending: false })
          .limit(20);
        if (aData && aData.length > 0) articles = aData;

        // Query MCQs for that edition
        const { data: mData } = await supabase
          .from('current_affairs_mcqs')
          .select('*')
          .eq('edition_date', targetDate)
          .limit(3);
        if (mData && mData.length > 0) mcqs = mData as McqRecord[];
      }
    } catch (err) {
      console.warn('[bot-renderer] Failed to fetch daily edition data:', err);
    }
  }

  const title = `PIB Daily Edition & UPSC Policy Digest (${targetDate || 'Today'}) | Tark`;
  const description = `Autonomous verified briefing of government policy notifications, Cabinet decisions, and high-yield Prelims MCQs for ${targetDate || 'today'}.`;
  const canonicalUrl = targetDate ? `https://www.tark.live/daily-edition/${encodeURIComponent(targetDate)}` : 'https://www.tark.live/daily-edition';

  const graphElements: any[] = [
    {
      '@type': 'NewsArticle',
      '@id': `${canonicalUrl}#edition`,
      'headline': title,
      'description': description,
      'datePublished': targetDate ? `${targetDate}T06:00:00Z` : new Date().toISOString(),
      'mainEntityOfPage': canonicalUrl,
      'url': canonicalUrl,
      'publisher': {
        '@type': 'Organization',
        'name': 'Tark Intelligence Bureau',
        'url': 'https://www.tark.live/'
      }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.tark.live/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Daily Edition', 'item': 'https://www.tark.live/daily-edition' },
        ...(targetDate ? [{ '@type': 'ListItem', 'position': 3, 'name': targetDate, 'item': canonicalUrl }] : [])
      ]
    }
  ];

  if (mcqs.length > 0) {
    const quiz = buildQuizSchema(mcqs, canonicalUrl, `Daily Edition Prelims Quiz (${targetDate})`);
    if (quiz) graphElements.push(quiz);
  }

  const digestContent = digest?.content || 'Verified daily policy briefing being synthesized.';
  const mcqsHtml = mcqs.length > 0 ? `
    <div class="mb-8">
      <h2 class="text-sm font-mono uppercase tracking-wider text-amber-300 font-bold mb-3">
        ⚡ Today's Prelims Practice Quiz
      </h2>
      ${mcqs.map((m) => renderMcqHtml(m)).join('')}
    </div>
  ` : '';

  const articlesHtml = articles.map((art) => {
    const artSlug = slugify(art.headline);
    const artUrl = `/intelligence/${artSlug}?id=${encodeURIComponent(art.id)}`;
    return `
      <li class="p-3 bg-slate-900/60 border border-slate-800 rounded">
        <span class="text-xs uppercase font-mono text-[#e0d0ab]">${escapeXml(art.source)} · ${escapeXml(art.ministry || 'Policy')}</span>
        <h3 class="text-base font-serif font-bold text-white mt-1">
          <a href="${artUrl}" class="hover:underline">${escapeXml(art.headline)}</a>
        </h3>
      </li>
    `;
  }).join('');

  const semanticHtml = `
    <main class="max-w-4xl mx-auto px-4 py-8 text-neutral-100 font-sans" data-ssr="true">
      <header class="border-b border-slate-800 pb-5 mb-6">
        <div class="text-xs font-mono uppercase tracking-wider text-[#e0d0ab] mb-2">
          Daily Curated Briefing · Edition Date: ${escapeXml(targetDate || 'Today')}
        </div>
        <h1 class="text-3xl sm:text-4xl font-serif font-bold text-white mb-2">
          ${escapeXml(digest?.title || `PIB Daily Intelligence Brief — ${targetDate}`)}
        </h1>
        <p class="text-sm text-slate-300 leading-relaxed">
          ${escapeXml(description)}
        </p>
      </header>

      <section class="prose prose-invert max-w-none mb-8 text-slate-200 text-sm sm:text-base leading-relaxed bg-slate-900/50 p-5 rounded-lg border border-slate-800">
        <h2 class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Executive Summary</h2>
        <div class="whitespace-pre-wrap">${escapeXml(digestContent)}</div>
      </section>

      ${mcqsHtml}

      ${articles.length > 0 ? `
      <section class="mb-8">
        <h2 class="text-lg font-serif font-bold text-white mb-3">Signals Ingested in this Edition</h2>
        <ul class="space-y-3">
          ${articlesHtml}
        </ul>
      </section>` : ''}

      <nav class="pt-6 border-t border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
        <a href="/daily-edition" class="text-amber-300 hover:underline">← Latest Edition</a>
        <a href="/intelligence" class="hover:text-slate-200">All Intelligence Signals</a>
        <a href="/arena" class="hover:text-slate-200">Practice Arena</a>
      </nav>
    </main>
  `;

  let modifiedHtml = baseHtml;
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(title)}</title>`);
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${escapeXml(description)}" />`
  );

  if (modifiedHtml.includes('<link rel="canonical"')) {
    modifiedHtml = modifiedHtml.replace(
      /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
      `<link rel="canonical" href="${escapeXml(canonicalUrl)}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  <link rel="canonical" href="${escapeXml(canonicalUrl)}" />\n</head>`);
  }

  const extraHead = `
    <script type="application/ld+json">
      ${JSON.stringify({ '@context': 'https://schema.org', '@graph': graphElements })}
    </script>
  `;
  modifiedHtml = modifiedHtml.replace('</head>', `${extraHead}\n</head>`);

  modifiedHtml = modifiedHtml.replace(
    /<div\s+id=["']root["']>[\s\S]*?<\/div>/i,
    `<div id="root">${semanticHtml}</div>`
  );

  return modifiedHtml;
}

/**
 * Generic Hub Pre-Renderer (/intelligence, /prs, /daily-edition)
 */
export async function renderHubSeoHtml(section: 'intelligence' | 'prs' | 'daily-edition'): Promise<string> {
  if (section === 'daily-edition') {
    return renderDailyEditionSeoHtml();
  }

  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

  let title = 'Daily UPSC Current Affairs & Policy Intelligence | Tark';
  let description = 'Autonomous policy & governance intelligence distilled directly from official PIB releases, Cabinet decisions, and The Hindu for UPSC CSE and State PSC prep.';
  let canonicalUrl = 'https://www.tark.live/intelligence';
  let h1 = 'Daily Policy & Governance Intelligence';
  let itemsHtml = '';

  if (section === 'prs') {
    title = 'PRS Legislative Vault — Parliamentary Acts & Bills Analysis | Tark';
    description = 'Dedicated statutory and policy intelligence archive containing deep analytical breakdowns of Parliamentary Bills, Acts, and Constitutional doctrines.';
    canonicalUrl = 'https://www.tark.live/prs';
    h1 = 'PRS Legislative Research Vault';

    try {
      const prsPath = path.resolve(process.cwd(), 'src/data/prs-vault-dossiers.json');
      if (fs.existsSync(prsPath)) {
        const prsItems = JSON.parse(fs.readFileSync(prsPath, 'utf-8'));
        if (Array.isArray(prsItems)) {
          itemsHtml = prsItems.slice(0, 15).map(item => `
            <li class="p-3.5 bg-slate-900/60 border border-slate-800 rounded">
              <span class="text-xs uppercase font-mono text-[#e0d0ab]">${escapeXml(item.source)} · ${escapeXml(item.ministry)}</span>
              <h2 class="text-base font-serif font-bold text-white mt-1">
                <a href="/prs/${encodeURIComponent(item.id)}" class="hover:underline">${escapeXml(item.headline)}</a>
              </h2>
            </li>
          `).join('');
        }
      }
    } catch {
      // ignore
    }
  }

  if (!itemsHtml && supabase) {
    try {
      const { data } = await supabase
        .from('current_affairs')
        .select('id, headline, source, ministry, created_at, published_at')
        .neq('source', 'PIB_Digest')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        itemsHtml = data.map((item: any) => {
          const slug = slugify(item.headline);
          const url = `/intelligence/${slug}?id=${encodeURIComponent(item.id)}`;
          return `
            <li class="p-3.5 bg-slate-900/60 border border-slate-800 rounded">
              <span class="text-xs uppercase font-mono text-[#e0d0ab]">${escapeXml(item.source)} · ${escapeXml(item.ministry || 'Policy')}</span>
              <h2 class="text-base font-serif font-bold text-white mt-1">
                <a href="${url}" class="hover:underline">${escapeXml(item.headline)}</a>
              </h2>
            </li>
          `;
        }).join('');
      }
    } catch {
      // ignore
    }
  }

  const semanticHtml = `
    <main class="max-w-4xl mx-auto px-4 py-8 text-neutral-100 font-sans" data-ssr="true">
      <header class="border-b border-slate-800 pb-5 mb-6">
        <h1 class="text-3xl font-serif font-bold text-white">${escapeXml(h1)}</h1>
        <p class="text-sm text-slate-300 mt-2">${escapeXml(description)}</p>
        <div class="flex flex-wrap gap-2 mt-4 text-xs font-mono">
          <a href="/intelligence/gs-1" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-1 Hub</a>
          <a href="/intelligence/gs-2" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-2 Hub</a>
          <a href="/intelligence/gs-3" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-3 Hub</a>
          <a href="/intelligence/gs-4" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-4 Hub</a>
        </div>
      </header>
      <section>
        <ul class="space-y-3">
          ${itemsHtml}
        </ul>
      </section>
    </main>
  `;

  let modifiedHtml = baseHtml;
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(title)}</title>`);
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${escapeXml(description)}" />`
  );
  if (modifiedHtml.includes('<link rel="canonical"')) {
    modifiedHtml = modifiedHtml.replace(
      /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
      `<link rel="canonical" href="${escapeXml(canonicalUrl)}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  <link rel="canonical" href="${escapeXml(canonicalUrl)}" />\n</head>`);
  }

  modifiedHtml = modifiedHtml.replace(
    /<div\s+id=["']root["']>[\s\S]*?<\/div>/i,
    `<div id="root">${semanticHtml}</div>`
  );
  return modifiedHtml;
}
