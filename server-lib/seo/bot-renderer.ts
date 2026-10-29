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

// Multi-tier in-memory bot rendering caches to guarantee sub-10ms response times
const ministryHubCache = new Map<string, { html: string; timestamp: number }>();
const gsHubCache = new Map<string, { html: string; timestamp: number }>();
const hubCache = new Map<string, { html: string; timestamp: number }>();
const dailyEditionCache = new Map<string, { html: string; timestamp: number }>();
const articleCache = new Map<string, { html: string; timestamp: number }>();

const TTL_2_HOURS = 2 * 60 * 60 * 1000;
const TTL_1_HOUR = 60 * 60 * 1000;
const TTL_15_MINS = 15 * 60 * 1000;

function setWithLruLimit(cache: Map<string, { html: string; timestamp: number }>, key: string, html: string, limit = 500) {
  if (cache.size >= limit) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { html, timestamp: Date.now() });
}

export function getBaseHtml(): string {
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
  primary_operator?: string;
  historical_twin?: { year: number; stem: string; anchor: string; takeaway: string };
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
          // 1. Try matching with ilike on the beginning of the headline
          const slugWords = slug.split('-').filter((w) => w.length > 2).slice(0, 4).join('%');
          if (slugWords) {
            const { data, error } = await supabase
              .from('current_affairs')
              .select('*')
              .ilike('headline', `%${slugWords}%`)
              .order('created_at', { ascending: false })
              .limit(10);
            if (!error && data && data.length > 0) {
              const matched = data.find((d: any) => slugify(d.headline) === slug) || data[0];
              if (matched) article = matched as ArticleRecord;
            }
          }
        }

        if (!article) {
          // 2. Fallback to querying recent records with minimal columns to find match
          const { data, error } = await supabase
            .from('current_affairs')
            .select('id, headline')
            .order('created_at', { ascending: false })
            .limit(200);

          if (!error && data) {
            const matched = data.find((d: any) => slugify(d.headline) === slug);
            if (matched) {
              const { data: fullArt } = await supabase
                .from('current_affairs')
                .select('*')
                .eq('id', matched.id)
                .limit(1)
                .maybeSingle();
              if (fullArt) article = fullArt as ArticleRecord;
            }
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
            .limit(1)
            .maybeSingle();
          if (data) mcqFound = data as McqRecord;
        }
        if (!mcqFound && article.headline) {
          const { data } = await supabase
            .from('current_affairs_mcqs')
            .select('*')
            .eq('headline', article.headline)
            .limit(1)
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

function renderHistoricalTwinHtml(article: ArticleRecord): string {
  const twin = article.historical_twin || {
    year: 2021,
    stem: 'Consider the following statements regarding the "National Clean Air Programme (NCAP)": 1. It is implemented by the Ministry of Environment, Forest and Climate Change. 2. Central Pollution Control Board acts as the sole regulatory executive body.',
    anchor: 'Cabinet Allocation of Business Rules & NCAP Framework',
    takeaway: 'UPSC swapped Central Pollution Control Board role with State Pollution Control Boards for state-level monitoring.',
  };

  return `
    <section class="historical-twin-pyq bg-slate-900/90 border border-cyan-500/40 rounded-lg p-4 sm:p-5 mb-8 shadow-lg">
      <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          <h2 class="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
            🏛️ Historical Twin PYQ Anchor (${twin.year})
          </h2>
        </div>
        <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
          UPSC Prelims ${twin.year}
        </span>
      </div>

      <p class="text-sm font-serif text-slate-100 font-medium leading-relaxed mb-3">
        ${escapeXml(twin.stem)}
      </p>

      <div class="bg-slate-950/80 border border-slate-800/80 rounded p-3 text-xs text-slate-300 space-y-1.5">
        <div><strong class="text-amber-300 font-mono">Forensic Anchor:</strong> ${escapeXml(twin.anchor)}</div>
        <div><strong class="text-emerald-400 font-mono">Examiner Trap Takeaway:</strong> ${escapeXml(twin.takeaway)}</div>
      </div>
    </section>
  `;
}

export function renderSeoHtml(article: ArticleRecord, reqUrl: string): string {
  const cacheKey = article.id || slugify(article.headline);
  const now = Date.now();
  const cached = articleCache.get(cacheKey);
  if (cached && (now - cached.timestamp < TTL_2_HOURS)) {
    return cached.html;
  }

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

      ${renderHistoricalTwinHtml(article)}

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

  // 1. Title and meta name=title
  modifiedHtml = modifiedHtml.replace(
    /<title>.*?<\/title>/i,
    `<title>${escapeXml(pageTitle)}</title>`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="title" content="${escapeXml(pageTitle)}" />`
  );

  // 2. Meta description
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${escapeXml(cleanDesc)}" />`
  );

  // 3. Canonical Link
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

  // 4. Open Graph tags
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
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']og:type["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:type" content="article" />`
  );

  // 5. Twitter card tags
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:title" content="${escapeXml(pageTitle)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:description" content="${escapeXml(cleanDesc)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:url" content="${escapeXml(canonicalUrl)}" />`
  );

  const extraHead = `
    <meta property="article:published_time" content="${publishedIso}" />
    <meta property="article:modified_time" content="${modifiedIso}" />
    <meta property="article:section" content="${escapeXml(article.ministry || 'Governance')}" />
    <script type="application/ld+json">
      ${JSON.stringify(schemaJson)}
    </script>
  `;

  modifiedHtml = modifiedHtml.replace('</head>', `${extraHead}\n</head>`);

  modifiedHtml = modifiedHtml.replace(
    /<div\s+id=["']root["']>[\s\S]*?<\/div>/i,
    `<div id="root">${semanticArticleHtml}</div>`
  );

  setWithLruLimit(articleCache, cacheKey, modifiedHtml, 1000);
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
  // Normalize gs-1, gs-i, 1, gs-2, etc.
  const normKey = rawPaper.toLowerCase().replace('gs-', '').replace('gs', '');
  let paperKey = 'gs-1';
  if (normKey === '2' || normKey === 'ii') paperKey = 'gs-2';
  else if (normKey === '3' || normKey === 'iii') paperKey = 'gs-3';
  else if (normKey === '4' || normKey === 'iv') paperKey = 'gs-4';

  const now = Date.now();
  const cached = gsHubCache.get(paperKey);
  if (cached && (now - cached.timestamp < TTL_2_HOURS)) {
    return cached.html;
  }

  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

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

  setWithLruLimit(gsHubCache, paperKey, modifiedHtml, 10);
  return modifiedHtml;
}

/**
 * Programmatic Ministry Hub Pre-Renderer (/intelligence/ministry/:slug)
 */
export async function renderMinistryHubSeoHtml(slug: string): Promise<string> {
  const cleanSlug = slugify(slug);
  const now = Date.now();
  const cached = ministryHubCache.get(cleanSlug);
  if (cached && (now - cached.timestamp < TTL_2_HOURS)) {
    return cached.html;
  }

  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

  const formattedName = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bAnd\b/g, '&');

  const title = `${formattedName} PIB Policy Briefs & UPSC Current Affairs | Tark`;
  const description = `Official policy releases, schemes, circulars, and Prelims practice questions from ${formattedName} distilled for UPSC Civil Services Examination.`;
  const canonicalUrl = `https://www.tark.live/intelligence/ministry/${cleanSlug}`;

  let articles: any[] = [];
  let mcqs: McqRecord[] = [];

  if (supabase) {
    try {
      // Query articles where ministry loosely matches
      const keywords = slug.split('-').filter(w => !['ministry', 'of', 'and', 'the', 'for'].includes(w));
      const rawSearchKey = keywords[0] || slug;
      const searchKey = rawSearchKey.replace(/[^a-zA-Z0-9]/g, '');

      if (searchKey) {
        const { data: rawArticles } = await supabase
          .from('current_affairs')
          .select('id, headline, source, ministry, summary, created_at, published_at')
          .ilike('ministry', `%${searchKey}%`)
          .order('created_at', { ascending: false })
          .limit(25);

        if (rawArticles && rawArticles.length > 0) {
          articles = rawArticles;
        }

        // Query MCQs safely for this subject category (avoids unindexed full-table question scan)
        const { data: rawMcqs } = await supabase
          .from('current_affairs_mcqs')
          .select('*')
          .ilike('subject', `%${searchKey}%`)
          .limit(2);

        if (rawMcqs) {
          mcqs = rawMcqs as McqRecord[];
        }
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

  setWithLruLimit(ministryHubCache, cleanSlug, modifiedHtml, 100);
  return modifiedHtml;
}

/**
 * Daily Edition Archive SSR Pre-Renderer (/daily-edition/:date or /daily-edition)
 */
export async function renderDailyEditionSeoHtml(dateStr?: string): Promise<string> {
  const requestedDate = (dateStr || '').trim();
  const now = Date.now();
  const cacheKey = requestedDate || '__root__';
  const cached = dailyEditionCache.get(cacheKey);
  const ttl = requestedDate ? TTL_1_HOUR : TTL_15_MINS;
  if (cached && (now - cached.timestamp < ttl)) {
    return cached.html;
  }

  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

  // Canonical URL is strictly derived from the requested route - NEVER OVERWRITTEN BY DB FALLBACK!
  const canonicalUrl = requestedDate
    ? `https://www.tark.live/daily-edition/${encodeURIComponent(requestedDate)}`
    : 'https://www.tark.live/daily-edition';

  let targetDate = requestedDate;
  let digest: any = null;
  let articles: any[] = [];
  let mcqs: McqRecord[] = [];
  let pastEditions: string[] = [];

  if (supabase) {
    try {
      if (requestedDate) {
        // Query digest specifically for requested date, with .limit(1) to handle duplicates safely
        const { data: dData } = await supabase
          .from('pib_digests')
          .select('*')
          .eq('date', requestedDate)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (dData) digest = dData;
      } else {
        // Root /daily-edition: load the latest available digest for display
        const { data: dData } = await supabase
          .from('pib_digests')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (dData) {
          digest = dData;
          targetDate = dData.date; // only used for body content, CANONICAL REMAINS /daily-edition!
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

      // Query past editions for crawlable archive links
      try {
        const { data: pastDigests } = await supabase
          .from('pib_digests')
          .select('date')
          .order('date', { ascending: false })
          .limit(30);
        if (pastDigests) {
          const uniqueDates = new Set<string>();
          for (const d of pastDigests) {
            if (d.date && !uniqueDates.has(d.date)) {
              uniqueDates.add(d.date);
            }
          }
          pastEditions = Array.from(uniqueDates).slice(0, 14);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.warn('[bot-renderer] Failed to fetch daily edition data:', err);
    }
  }

  const titleDate = requestedDate || targetDate || 'Today';
  const title = `PIB Daily Edition & UPSC Policy Digest (${titleDate}) | Tark`;
  const description = `Autonomous verified briefing of government policy notifications, Cabinet decisions, and high-yield Prelims MCQs for ${titleDate}.`;

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

      ${pastEditions.length > 0 ? `
      <section class="mb-8 p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
        <h2 class="text-xs font-mono uppercase tracking-wider text-[#e0d0ab] font-bold mb-3">📅 Past Daily Editions Archive</h2>
        <div class="flex flex-wrap gap-2 text-xs font-mono">
          ${pastEditions.map((d) => `<a href="/daily-edition/${encodeURIComponent(d)}" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-[#e0d0ab]/40 transition-colors">${escapeXml(d)}</a>`).join('')}
        </div>
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
    /<meta\s+name=["']title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="title" content="${escapeXml(title)}" />`
  );
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
    /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:title" content="${escapeXml(title)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:description" content="${escapeXml(description)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:url" content="${escapeXml(canonicalUrl)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:title" content="${escapeXml(title)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:description" content="${escapeXml(description)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:url" content="${escapeXml(canonicalUrl)}" />`
  );

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

  setWithLruLimit(dailyEditionCache, cacheKey, modifiedHtml, 100);
  return modifiedHtml;
}

/**
 * Generic Hub Pre-Renderer (/intelligence, /prs, /daily-edition, /observatory, /syllabus, /arena, /thinkers, /humanities, /manifesto, /sources, /leaderboard)
 */
export type HubSectionType =
  | 'intelligence'
  | 'international'
  | 'prs'
  | 'daily-edition'
  | 'observatory'
  | 'syllabus'
  | 'arena'
  | 'thinkers'
  | 'humanities'
  | 'manifesto'
  | 'sources'
  | 'leaderboard'
  | 'library';

export async function renderHubSeoHtml(section: HubSectionType): Promise<string> {
  if (section === 'daily-edition') {
    return renderDailyEditionSeoHtml();
  }

  const now = Date.now();
  const cached = hubCache.get(section);
  if (cached && (now - cached.timestamp < TTL_2_HOURS)) {
    return cached.html;
  }

  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

  let title = 'Daily UPSC Current Affairs & Policy Intelligence | Tark';
  let description = 'Autonomous policy & governance intelligence distilled directly from official PIB releases, Cabinet decisions, and The Hindu for UPSC CSE and State PSC prep.';
  let canonicalUrl = `https://www.tark.live/${section}`;
  let h1 = 'Daily Policy & Governance Intelligence';
  let semanticBody = '';

  if (section === 'library') {
    title = 'UPSC Subject Study Library & High-Yield Pillars | Tark';
    description = 'Comprehensive static syllabus repository, foundational concepts, mind maps, static reference facts, and mains answer blueprints for UPSC CSE preparation.';
    canonicalUrl = 'https://www.tark.live/library';
    h1 = 'UPSC Subject Study Library & High-Yield Pillars';
    semanticBody = `
      <section class="space-y-6 text-sm text-slate-300">
        <p class="leading-relaxed">
          The Tark Study Library organizes foundational civil services concepts, mind maps, and high-yield examination notes across the four General Studies pillars and CSAT.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <h2 class="font-mono text-xs uppercase tracking-wider text-amber-300 font-bold mb-1">GS-I // Heritage & Geography</h2>
            <p class="text-xs text-slate-300 mb-2">Temple architecture, Gandhian movements, Buddhism & Jainism, physical & human geography.</p>
            <a href="/library?subject=GS1&view=notes" class="text-xs font-mono text-[#e0d0ab] hover:underline">Explore GS-1 Notes →</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <h2 class="font-mono text-xs uppercase tracking-wider text-cyan-300 font-bold mb-1">GS-II // Polity & Governance</h2>
            <p class="text-xs text-slate-300 mb-2">Basic structure doctrine, Centre-State relations, parliamentary committees, statutory bodies.</p>
            <a href="/library?subject=GS2&view=notes" class="text-xs font-mono text-[#e0d0ab] hover:underline">Explore GS-2 Notes →</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <h2 class="font-mono text-xs uppercase tracking-wider text-purple-300 font-bold mb-1">GS-III // Economy & Environment</h2>
            <p class="text-xs text-slate-300 mb-2">Monetary policy & liquidity, nuclear energy, balance of payments, Ramsar wetlands & protected areas.</p>
            <a href="/library?subject=GS3&view=notes" class="text-xs font-mono text-[#e0d0ab] hover:underline">Explore GS-3 Notes →</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <h2 class="font-mono text-xs uppercase tracking-wider text-emerald-300 font-bold mb-1">GS-IV // Ethics & Integrity</h2>
            <p class="text-xs text-slate-300 mb-2">Duty & utilitarianism in public policy, emotional intelligence, moral philosophy case studies.</p>
            <a href="/library?subject=GS4&view=notes" class="text-xs font-mono text-[#e0d0ab] hover:underline">Explore GS-4 Notes →</a>
          </div>
        </div>
      </section>
    `;
  } else if (section === 'prs') {
    title = 'PRS Legislative Vault — Parliamentary Acts & Bills Analysis | Tark';
    description = 'Dedicated statutory and policy intelligence archive containing deep analytical breakdowns of Parliamentary Bills, Acts, and Constitutional doctrines.';
    canonicalUrl = 'https://www.tark.live/prs';
    h1 = 'PRS Legislative Research Vault';

    let itemsHtml = '';
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

    semanticBody = `
      <section>
        <ul class="space-y-3">
          ${itemsHtml || '<li class="text-slate-400 text-sm">No legislative dossiers found.</li>'}
        </ul>
      </section>
    `;
  } else if (section === 'observatory') {
    title = '25-Year UPSC Question Observatory & High-Yield Matrix | Tark';
    description = 'Explore two and a half decades of UPSC Civil Services Prelims questions categorized by subject, theme, and examiner cognitive depth.';
    canonicalUrl = 'https://www.tark.live/observatory';
    h1 = '25-Year UPSC Civil Services Question Observatory';

    semanticBody = `
      <section class="space-y-6 text-sm text-slate-300">
        <p class="leading-relaxed">
          The Tark Question Observatory indexes 25 years of UPSC Civil Services Examination Prelims questions (1995–2025), categorized across four foundational General Studies pillars and mapped to examiner trap patterns.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <h2 class="font-mono text-xs uppercase tracking-wider text-amber-300 font-bold mb-1">GS Paper 1 // Heritage, History & Geography</h2>
            <p class="text-xs text-slate-300 mb-3">Ancient, Medieval, Modern History, Art & Culture, Physical & Indian Geography, Demographics.</p>
            <a href="/intelligence/gs-1" class="text-xs font-mono text-[#e0d0ab] hover:underline">Explore GS-1 Questions & Dossiers →</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <h2 class="font-mono text-xs uppercase tracking-wider text-cyan-300 font-bold mb-1">GS Paper 2 // Polity, Governance & IR</h2>
            <p class="text-xs text-slate-300 mb-3">Indian Constitution, Federal Architecture, Parliamentary Procedures, Statutory Bodies, Bilateral Treaties.</p>
            <a href="/intelligence/gs-2" class="text-xs font-mono text-[#e0d0ab] hover:underline">Explore GS-2 Questions & Dossiers →</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <h2 class="font-mono text-xs uppercase tracking-wider text-purple-300 font-bold mb-1">GS Paper 3 // Economy, Sci-Tech & Environment</h2>
            <p class="text-xs text-slate-300 mb-3">Macroeconomics, RBI Regulatory Circulars, Agriculture & MSP, Space, Defence, Ecology & COP Treaties.</p>
            <a href="/intelligence/gs-3" class="text-xs font-mono text-[#e0d0ab] hover:underline">Explore GS-3 Questions & Dossiers →</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <h2 class="font-mono text-xs uppercase tracking-wider text-emerald-300 font-bold mb-1">GS Paper 4 // Ethics, Integrity & Aptitude</h2>
            <p class="text-xs text-slate-300 mb-3">Moral Philosophers, Probity in Governance, Emotional Intelligence, Civil Service Dilemmas.</p>
            <a href="/intelligence/gs-4" class="text-xs font-mono text-[#e0d0ab] hover:underline">Explore GS-4 Questions & Dossiers →</a>
          </div>
        </div>
      </section>
    `;
  } else if (section === 'syllabus') {
    title = 'UPSC Civil Services Complete Syllabus Matrix & High-Yield Hierarchy | Tark';
    description = 'Interactive UPSC Civil Services GS Papers 1 to 4 and CSAT syllabus matrix with micro-topic classification and past question distributions.';
    canonicalUrl = 'https://www.tark.live/syllabus';
    h1 = 'UPSC Civil Services Examination Master Syllabus Matrix';

    semanticBody = `
      <section class="space-y-6 text-sm text-slate-300">
        <p class="leading-relaxed">
          Comprehensive civil services examination blueprint detailing the four General Studies mains papers, preliminary examination curriculum, and micro-topic classification.
        </p>
        <div class="space-y-4">
          <div class="p-4 bg-slate-900/70 border border-slate-800 rounded">
            <h2 class="font-serif font-bold text-base text-white mb-1">GS-I: Indian Heritage and Culture, History and Geography of the World and Society</h2>
            <p class="text-xs text-slate-300">Salient aspects of Art Forms, Literature and Architecture from ancient to modern times; Modern Indian history; The Freedom Struggle; Post-independence consolidation; World history; Salient features of Indian Society; Diversity of India; Role of women; Urbanization; Globalization; Social empowerment; Physical geography; Distribution of key natural resources.</p>
            <div class="mt-2 text-xs font-mono"><a href="/intelligence/gs-1" class="text-amber-300 hover:underline">Access GS-1 Intelligence Hub →</a></div>
          </div>
          <div class="p-4 bg-slate-900/70 border border-slate-800 rounded">
            <h2 class="font-serif font-bold text-base text-white mb-1">GS-II: Governance, Constitution, Polity, Social Justice and International Relations</h2>
            <p class="text-xs text-slate-300">Indian Constitution—historical underpinnings, evolution, features, amendments, significant provisions and basic structure; Functions and responsibilities of the Union and the States; Separation of powers; Parliament and State legislatures; Executive and Judiciary; Representation of People's Act; Statutory, regulatory and quasi-judicial bodies; Welfare schemes; Health, Education, Human Resources; Bilateral, regional and global groupings.</p>
            <div class="mt-2 text-xs font-mono"><a href="/intelligence/gs-2" class="text-amber-300 hover:underline">Access GS-2 Intelligence Hub →</a></div>
          </div>
          <div class="p-4 bg-slate-900/70 border border-slate-800 rounded">
            <h2 class="font-serif font-bold text-base text-white mb-1">GS-III: Technology, Economic Development, Bio-diversity, Environment, Security and Disaster Management</h2>
            <p class="text-xs text-slate-300">Indian Economy and issues relating to planning, mobilization of resources, growth, development and employment; Inclusive growth; Government Budgeting; Major crops, cropping patterns, irrigation, MSP, PDS, buffer stocks; Technology missions; Food processing; Land reforms; Science and Technology; Indigenization of technology; Conservation, environmental pollution and degradation; Disaster management; Internal security challenges.</p>
            <div class="mt-2 text-xs font-mono"><a href="/intelligence/gs-3" class="text-amber-300 hover:underline">Access GS-3 Intelligence Hub →</a></div>
          </div>
          <div class="p-4 bg-slate-900/70 border border-slate-800 rounded">
            <h2 class="font-serif font-bold text-base text-white mb-1">GS-IV: Ethics, Integrity and Aptitude</h2>
            <p class="text-xs text-slate-300">Ethics and Human Interface; Human Values—lessons from the lives and teachings of great leaders, reformers and administrators; Attitude; Aptitude and foundational values for Civil Service; Emotional intelligence; Contributions of moral thinkers and philosophers from India and world; Public/Civil service values and Ethics in Public administration; Probity in Governance; Case Studies.</p>
            <div class="mt-2 text-xs font-mono"><a href="/intelligence/gs-4" class="text-amber-300 hover:underline">Access GS-4 Intelligence Hub →</a></div>
          </div>
        </div>
      </section>
    `;
  } else if (section === 'arena') {
    title = 'Competitive Test Arena & Prelims Simulator | Tark';
    description = 'Timed high-stakes examination simulator calibrated with authentic negative marking (+2.00 / -0.66) and server-side autopsies.';
    canonicalUrl = 'https://www.tark.live/arena';
    h1 = 'Tark Competitive Test Arena & Examination Simulator';

    semanticBody = `
      <section class="space-y-6 text-sm text-slate-300">
        <p class="leading-relaxed">
          The Tark Test Arena delivers authentic civil services preliminary examination drills with strict negative marking (+2.00 for correct, -0.66 for incorrect). Every question is anchored to verified primary policy releases or official UPSC past years questions with forensic autopsies.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded">
            <h2 class="font-mono text-xs uppercase text-amber-300 font-bold mb-2">⚡ Negative Marking Calibrated</h2>
            <p class="text-xs text-slate-300">True UPSC scoring penalizes guessing (-0.66). Practice disciplined risk calibration.</p>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded">
            <h2 class="font-mono text-xs uppercase text-cyan-300 font-bold mb-2">🔬 Examiner Traps Decoded</h2>
            <p class="text-xs text-slate-300">Identifies Institutional Swaps, Polarity Inversions, and Temporal Scope shifts in real-time.</p>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded">
            <h2 class="font-mono text-xs uppercase text-emerald-300 font-bold mb-2">📜 Wire-Verified Provenance</h2>
            <p class="text-xs text-slate-300">Questions derived directly from PIB, Gazette notifications, and Parliamentary Acts.</p>
          </div>
        </div>
        <div class="pt-4 border-t border-slate-800 text-xs font-mono flex flex-wrap gap-4">
          <a href="/observatory" class="text-amber-300 hover:underline">View 25-Year PYQ Observatory →</a>
          <a href="/daily-edition" class="text-amber-300 hover:underline">Practice Today's PIB Edition →</a>
          <a href="/prs" class="text-amber-300 hover:underline">Explore Legislative Vault →</a>
        </div>
      </section>
    `;
  } else if (section === 'thinkers' || section === 'humanities') {
    const isThinkers = section === 'thinkers';
    title = isThinkers
      ? 'Canonical Thinkers & Philosophical Passages | Tark'
      : 'Primary Thinkers & Humanities Deep Reader | Tark';
    description = isThinkers
      ? 'Verbatim philosophical texts and thinkers mapped to UPSC GS Paper 4 Ethics and Essay: Ambedkar, Gandhi, Kant, Mill, and Aristotle.'
      : 'Unfiltered primary philosophy, political theory, and historical texts for deep analytical foundations in UPSC Mains.';
    canonicalUrl = `https://www.tark.live/${section}`;
    h1 = isThinkers
      ? 'Canonical Moral Thinkers & Philosophical Passages'
      : 'Primary Humanities Reader & Moral Thinkers Deep Archive';

    let thinkersListHtml = '';
    try {
      const canonPath = path.resolve(process.cwd(), 'src/data/humanities-canon.json');
      if (fs.existsSync(canonPath)) {
        const canonData = JSON.parse(fs.readFileSync(canonPath, 'utf-8'));
        if (Array.isArray(canonData.thinkers)) {
          thinkersListHtml = canonData.thinkers.map((t: any) => {
            const passages = Array.isArray(t.passages) ? t.passages : [];
            const samplePassage = passages[0]?.text || '';
            const pyqs = passages[0]?.pyqCitations || [];
            return `
              <article class="p-5 bg-slate-900/70 border border-slate-800 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <h2 class="text-lg font-serif font-bold text-white">${escapeXml(t.name)}</h2>
                  <span class="text-xs font-mono text-[#e0d0ab]">${escapeXml(t.workTitle || '')} (${t.year || ''})</span>
                </div>
                <p class="text-xs font-mono text-slate-400 mb-3">${escapeXml(t.publicDomainBasis || 'Public Domain')}</p>
                ${samplePassage ? `
                  <blockquote class="text-xs sm:text-sm text-slate-200 italic border-l-2 border-amber-400/80 pl-3 my-3 leading-relaxed">
                    "${escapeXml(samplePassage.slice(0, 360))}..."
                  </blockquote>
                ` : ''}
                ${pyqs.length > 0 ? `
                  <div class="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-cyan-300">
                    <span>🏛️ UPSC Examination Nexus:</span> ${escapeXml(pyqs.map((p: any) => `${p.paper} (${p.year}) - ${p.note}`).join(' · '))}
                  </div>
                ` : ''}
              </article>
            `;
          }).join('\n');
        }
      }
    } catch {
      // ignore
    }

    semanticBody = `
      <section class="space-y-6 text-sm text-slate-300">
        <p class="leading-relaxed">
          Unfiltered canonical philosophy and political thought directly excerpted for civil services examination aspirants tackling GS-IV Ethics, Integrity and Aptitude, and Essay papers.
        </p>
        <div class="space-y-4">
          ${thinkersListHtml || '<p class="text-slate-400">Loading thinkers archive...</p>'}
        </div>
      </section>
    `;
  } else if (section === 'manifesto') {
    title = 'The Tark Manifesto — The War on Noise in Civil Services Preparation | Tark';
    description = 'Our educational philosophy: sterile testing arenas, deterministic evaluation, and signal-rich intelligence free from commercial noise.';
    canonicalUrl = 'https://www.tark.live/manifesto';
    h1 = 'The Tark Manifesto: The War on Noise in Civil Services Preparation';

    semanticBody = `
      <section class="space-y-6 text-sm text-slate-300 leading-relaxed">
        <div>
          <h2 class="text-lg font-serif font-bold text-white mb-2">I. The War on Noise</h2>
          <p>
            Civil services aspirants in India are subjected to hundreds of pages of unverified coaching digests, sensationalized YouTube current affairs roundups, and speculative test series with random subjective scoring. Tark was engineered as an antidote: a sterile, distraction-free analytical arena focused purely on authentic government primary sources and mathematical evaluation.
          </p>
        </div>
        <div>
          <h2 class="text-lg font-serif font-bold text-white mb-2">II. Strict Primary Source Grounding</h2>
          <p>
            Every single intelligence brief and current affairs card on Tark is grounded in official government releases: Press Information Bureau (PIB), The Gazette of India, Parliamentary Acts (PRS India), and Reserve Bank of India statutory circulars. Zero coaching opinions. Zero commercial speculation.
          </p>
        </div>
        <div>
          <h2 class="text-lg font-serif font-bold text-white mb-2">III. The Sovereign Data & Privacy Charter</h2>
          <p>
            Zero advertisements. Zero tracking cookies. Zero selling of candidate telephone numbers or test performance metrics to coaching cartels. Tark is fully compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act).
          </p>
        </div>
      </section>
    `;
  } else if (section === 'sources') {
    title = 'Primary Sources & Evidence-Span Directory | Tark';
    description = 'Verified government sources directory: PIB releases, Gazette notifications, PRS India legislative briefs, and RBI monetary policy bulletins.';
    canonicalUrl = 'https://www.tark.live/sources';
    h1 = 'Verified Sovereign & Primary Sources Directory';

    semanticBody = `
      <section class="space-y-6 text-sm text-slate-300">
        <p class="leading-relaxed">
          Tark enforces an uncompromising cite-or-drop protocol. If an administrative fact or statistic cannot be verified against an official primary source, it is omitted. Below is our canonical source directory.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded">
            <h2 class="font-mono text-xs uppercase text-amber-300 font-bold mb-1">Press Information Bureau (PIB)</h2>
            <p class="text-xs text-slate-300 mb-2">Official nodal agency of the Government of India for disseminating information on policy decisions and development programmes.</p>
            <a href="https://pib.gov.in" target="_blank" rel="noopener" class="text-xs font-mono text-[#e0d0ab] hover:underline">pib.gov.in ↗</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded">
            <h2 class="font-mono text-xs uppercase text-cyan-300 font-bold mb-1">The Gazette of India (eGazette)</h2>
            <p class="text-xs text-slate-300 mb-2">Official sovereign legal publication containing statutory notifications, appointments, and President of India orders.</p>
            <a href="https://egazette.gov.in" target="_blank" rel="noopener" class="text-xs font-mono text-[#e0d0ab] hover:underline">egazette.gov.in ↗</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded">
            <h2 class="font-mono text-xs uppercase text-purple-300 font-bold mb-1">PRS Legislative Research</h2>
            <p class="text-xs text-slate-300 mb-2">Non-partisan research body tracking Parliamentary legislation, committee reports, and state assembly laws.</p>
            <a href="/prs" class="text-xs font-mono text-[#e0d0ab] hover:underline">Tark PRS Vault Archive →</a>
          </div>
          <div class="p-4 bg-slate-900/80 border border-slate-800 rounded">
            <h2 class="font-mono text-xs uppercase text-emerald-300 font-bold mb-1">Reserve Bank of India (RBI)</h2>
            <p class="text-xs text-slate-300 mb-2">Central banking authority regulatory releases, Monetary Policy Committee (MPC) resolutions, and financial stability reports.</p>
            <a href="https://rbi.org.in" target="_blank" rel="noopener" class="text-xs font-mono text-[#e0d0ab] hover:underline">rbi.org.in ↗</a>
          </div>
        </div>
      </section>
    `;
  } else if (section === 'leaderboard') {
    title = 'Live Candidate Leaderboard & Rankings | Tark';
    description = 'Real-time percentile rankings, daily streaks, and analytical scores across competitive examination aspirants.';
    canonicalUrl = 'https://www.tark.live/leaderboard';
    h1 = 'Live Candidate Arena Leaderboard & Percentile Matrix';

    semanticBody = `
      <section class="space-y-6 text-sm text-slate-300">
        <p class="leading-relaxed">
          Percentile rankings computed across all simulated test arena sessions. Scores strictly follow UPSC negative marking (+2.00 / -0.66) and evaluate question elimination speed and accuracy under time pressure.
        </p>
        <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <h2 class="font-mono text-xs uppercase text-amber-300 font-bold mb-2">Evaluation Architecture</h2>
          <ul class="text-xs space-y-2 list-disc list-inside text-slate-300">
            <li>Strict server-side validation prevents tamper or client-side scoring manipulations.</li>
            <li>Cohort percentiles calculated against all candidate attempts in the current examination cycle.</li>
            <li>Diagnostic autopsies break down performance by Subject Pillar and Examiner Trap sensitivity.</li>
          </ul>
        </div>
      </section>
    `;
  } else if (section === 'international') {
    title = 'International Affairs & Foreign Policy Intelligence | Bilateral, Treaties & Multilateral | Tark';
    description = 'Track sovereign state actions, multilateral treaties, bilateral accords, and India-posture verification across MEA, UN, WTO, and wire intelligence for UPSC CSE.';
    canonicalUrl = 'https://www.tark.live/intelligence/international';
    h1 = 'International Affairs & Foreign Policy Intelligence';

    let itemsHtml = '';
    if (supabase) {
      try {
        const { data } = await supabase
          .from('current_affairs')
          .select('id, headline, source, ministry, created_at, published_at, coverage_scope')
          .or('coverage_scope.in.(international,cross_border),source.in.(MEA,UN NEWS,WTO,WIKIPEDIA),ministry.ilike.%External Affairs%')
          .order('created_at', { ascending: false })
          .limit(50);

        if (data && data.length > 0) {
          itemsHtml = data.map((item: any) => {
            const slug = slugify(item.headline);
            const url = `/intelligence/${slug}?id=${encodeURIComponent(item.id)}`;
            return `
              <li class="p-3.5 bg-slate-900/60 border border-slate-800 rounded">
                <span class="text-xs uppercase font-mono text-[#e0d0ab]">${escapeXml(item.source)} · ${escapeXml(item.ministry || 'International')}</span>
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

    semanticBody = `
      <div class="flex flex-wrap gap-2 mb-6 text-xs font-mono">
        <a href="/intelligence" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">All Intelligence</a>
        <a href="/intelligence/gs-2" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-2 Hub (Polity & IR)</a>
        <a href="/intelligence/international" class="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-600/50 text-amber-300 font-bold">International & IR</a>
      </div>
      <section>
        <ul class="space-y-3">
          ${itemsHtml || '<li class="text-slate-400 text-sm">No international dispatches currently available.</li>'}
        </ul>
      </section>
    `;
  } else {
    // intelligence default
    canonicalUrl = 'https://www.tark.live/intelligence';
    h1 = 'Daily Policy & Governance Intelligence';

    let itemsHtml = '';
    if (supabase) {
      try {
        const { data } = await supabase
          .from('current_affairs')
          .select('id, headline, source, ministry, created_at, published_at')
          .neq('source', 'PIB_Digest')
          .order('created_at', { ascending: false })
          .limit(50);

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

    semanticBody = `
      <div class="flex flex-wrap gap-2 mb-6 text-xs font-mono">
        <a href="/intelligence/gs-1" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-1 Hub</a>
        <a href="/intelligence/gs-2" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-2 Hub</a>
        <a href="/intelligence/gs-3" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-3 Hub</a>
        <a href="/intelligence/gs-4" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-400">GS-4 Hub</a>
        <a href="/daily-edition" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300 hover:border-cyan-400">Daily PIB Edition</a>
        <a href="/prs" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300 hover:border-cyan-400">PRS Vault</a>
      </div>
      <section>
        <ul class="space-y-3">
          ${itemsHtml || '<li class="text-slate-400 text-sm">No recent policy items available.</li>'}
        </ul>
      </section>
    `;
  }

  const semanticHtml = `
    <main class="max-w-4xl mx-auto px-4 py-8 text-neutral-100 font-sans" data-ssr="true">
      <header class="border-b border-slate-800 pb-5 mb-6">
        <nav class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
          <a href="/" class="hover:text-slate-200">Home</a>
          <span>/</span>
          <span class="text-[#e0d0ab] font-bold">${escapeXml(section)}</span>
        </nav>
        <h1 class="text-3xl font-serif font-bold text-white">${escapeXml(h1)}</h1>
        <p class="text-sm text-slate-300 mt-2">${escapeXml(description)}</p>
      </header>
      ${semanticBody}
      <footer class="pt-8 mt-8 border-t border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
        <a href="/" class="hover:text-slate-200">Home</a>
        <a href="/intelligence" class="hover:text-slate-200">Daily Intelligence</a>
        <a href="/daily-edition" class="hover:text-slate-200">Daily PIB Edition</a>
        <a href="/prs" class="hover:text-slate-200">PRS Vault</a>
        <a href="/arena" class="hover:text-slate-200">Practice Arena</a>
        <a href="/observatory" class="hover:text-slate-200">PYQ Observatory</a>
        <a href="/syllabus" class="hover:text-slate-200">Syllabus</a>
        <a href="/thinkers" class="hover:text-slate-200">Thinkers</a>
        <a href="/manifesto" class="hover:text-slate-200">Manifesto</a>
        <a href="/sources" class="hover:text-slate-200">Sources</a>
        <a href="/privacy" class="hover:text-slate-200">Privacy</a>
        <a href="/terms" class="hover:text-slate-200">Terms</a>
        <a href="/refund" class="hover:text-slate-200">Refund</a>
      </footer>
    </main>
  `;

  let modifiedHtml = baseHtml;
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(title)}</title>`);
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="title" content="${escapeXml(title)}" />`
  );
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
    /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:title" content="${escapeXml(title)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:description" content="${escapeXml(description)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:url" content="${escapeXml(canonicalUrl)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:title" content="${escapeXml(title)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:description" content="${escapeXml(description)}" />`
  );
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property=["']twitter:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:url" content="${escapeXml(canonicalUrl)}" />`
  );

  const extraHead = `
    <script type="application/ld+json">
      ${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
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
          { '@type': 'ListItem', 'position': 2, 'name': section.toUpperCase(), 'item': canonicalUrl }
        ]
      }
    ]
  })}
    </script>
  `;
  modifiedHtml = modifiedHtml.replace('</head>', `${extraHead}\n</head>`);

  modifiedHtml = modifiedHtml.replace(
    /<div\s+id=["']root["']>[\s\S]*?<\/div>/i,
    `<div id="root">${semanticHtml}</div>`
  );
  setWithLruLimit(hubCache, section, modifiedHtml, 20);
  return modifiedHtml;
}

/**
 * Legal & Compliance Suite Pre-Renderer (/privacy, /terms, /refund)
 * Strictly synchronized with TARK-LEGAL-*-2026-V2.4 canonical charters.
 */
export function renderLegalSeoHtml(type: 'privacy' | 'terms' | 'refund'): string {
  const baseHtml = getBaseHtml();

  let title = 'Privacy Policy & Data Governance Charter | Tark';
  let description = 'Digital Personal Data Protection Act (DPDP Act 2023) compliant privacy policy. Zero ads, zero tracking pixels, zero candidate data monetization.';
  let canonicalUrl = 'https://www.tark.live/privacy';
  let semanticHtml = '';

  if (type === 'privacy') {
    title = 'Privacy Policy & Data Governance Charter | Tark';
    description = 'Digital Personal Data Protection Act (DPDP Act 2023) compliant privacy policy. Zero ads, zero tracking pixels, zero candidate data monetization.';
    canonicalUrl = 'https://www.tark.live/privacy';

    semanticHtml = `
      <main class="max-w-4xl mx-auto px-4 py-12 text-neutral-100 font-sans leading-relaxed" data-ssr="true">
        <div class="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <a href="/" class="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#e0d0ab] hover:underline bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            ← Return to Tark War Room
          </a>
          <span class="text-[11px] font-mono text-slate-400">TARK STATUTORY COMPLIANCE SUITE</span>
        </div>
        <header class="border-b border-slate-800 pb-6 mb-8">
          <span class="inline-block px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded text-xs font-mono text-emerald-400 font-medium mb-3">
            STATUTORY CHARTER // TARK-LEGAL-PP-2026-V2.4
          </span>
          <h1 class="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">Privacy Policy & Data Governance Charter</h1>
          <p class="text-xs font-mono text-slate-400 mt-2">
            Effective: October 14, 2026 · Jurisdiction: Republic of India · DPDP Act, 2023 & IT Act Section 43A Compliant
          </p>
        </header>

        <section class="space-y-6 text-sm text-slate-300">
          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">1. Preamble & Sovereign Data Covenant</h2>
            <p>
              This Privacy Policy and Data Governance Charter governs the collection, processing, cryptographic storage, telemetry aggregation, and erasure of Personal Data and Usage Telemetry by <strong>Tark</strong> (<a href="https://www.tark.live" class="text-[#e0d0ab] hover:underline">https://www.tark.live</a>). Under the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, Tark acts as a <em>Data Fiduciary</em> and you act as a <em>Data Principal</em>.
            </p>
            <div class="mt-4 p-4 rounded bg-slate-900/80 border border-slate-800">
              <strong class="text-white block mb-1 font-mono text-xs uppercase tracking-wider">The Tark Zero-Ad & Zero-Brokerage Mandate:</strong>
              <ul class="list-disc pl-5 space-y-1 text-xs">
                <li>We do not serve third-party ads, behavioural retargeting pixels, affiliate links, or sponsored commercial content.</li>
                <li>We never sell, rent, license, syndicate, or trade your Personal Data, test performance records, or psychometric telemetry to coaching institutes, marketing agencies, or data brokers.</li>
              </ul>
            </div>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">2. Lawful Purpose & Data Retention Matrix</h2>
            <p class="text-xs text-slate-400 mb-3">
              In adherence to the statutory principle of Data Minimization, we collect strictly what is necessary to grade tests on the server, preserve your longitudinal record, and verify lifetime seat ownership:
            </p>
            <div class="overflow-x-auto border border-slate-800 rounded">
              <table class="w-full text-left font-sans text-xs border-collapse min-w-[620px]">
                <thead>
                  <tr class="border-b border-slate-800 bg-slate-900 text-[#e0d0ab] font-mono">
                    <th class="py-2.5 px-3">Data Category</th>
                    <th class="py-2.5 px-3">Specific Data Elements</th>
                    <th class="py-2.5 px-3">Lawful Basis & Purpose</th>
                    <th class="py-2.5 px-3">Retention Period</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td class="py-2.5 px-3 font-semibold text-white">A. Unauthenticated Diagnostic</td>
                    <td class="py-2.5 px-3">Ephemeral option clicks (a, b, c, d), timer ticks, landing page diagnostic payload.</td>
                    <td class="py-2.5 px-3">User-initiated +2.00 / −0.66 evaluation without requiring mandatory registration.</td>
                    <td class="py-2.5 px-3 font-mono text-[11px]">Purged on session close</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-3 font-semibold text-white">B. Identity & Auth</td>
                    <td class="py-2.5 px-3">Email address, chosen handle (Leaderboard), OAuth session JWTs.</td>
                    <td class="py-2.5 px-3">Explicit Consent (Sec. 6, DPDP Act) for account synchronization and seat binding.</td>
                    <td class="py-2.5 px-3 font-mono text-[11px]">Active account + 30 days</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-3 font-semibold text-white">C. Psychometric Telemetry</td>
                    <td class="py-2.5 px-3">Attempt history, +2.00 / −0.66 logs, 50:50 risk ratios, subject accuracy matrices, vulnerability tags.</td>
                    <td class="py-2.5 px-3">Contractual performance: powering the 4-stage loop (Practice → Diagnose → Review → Improve).</td>
                    <td class="py-2.5 px-3 font-mono text-[11px]">Account lifetime; erasable on demand</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-3 font-semibold text-white">D. Financial Metadata</td>
                    <td class="py-2.5 px-3">Razorpay order_id, payment_id, verification signature, lifetime seat index (1–500).</td>
                    <td class="py-2.5 px-3">Statutory tax & audit compliance (Income Tax Act, 1961 and GST rules).</td>
                    <td class="py-2.5 px-3 font-mono text-[11px]">8 years (Statutory)</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-3 font-semibold text-white">E. Security Logs</td>
                    <td class="py-2.5 px-3">Truncated IP, TLS handshake metadata, User-Agent, rate-limit counters.</td>
                    <td class="py-2.5 px-3">Scraping prevention, DDoS defense, server-side grading integrity.</td>
                    <td class="py-2.5 px-3 font-mono text-[11px]">Rolling 90-day window</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-slate-400 mt-2">
              * Payment instrument exclusion: All transactions are processed exclusively via Razorpay Software Pvt. Ltd. (PCI-DSS Level 1 certified). Tark never stores or views raw credit/debit card numbers or UPI PINs.
            </p>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">3. Sub-Processors & Technical Safeguards</h2>
            <p>
              Tark engages enterprise infrastructure providers: <strong>Supabase Inc.</strong> (encrypted PostgreSQL with Row Level Security), <strong>Vercel Inc.</strong> (global edge delivery & TLS 1.3 termination), and <strong>Razorpay Software Pvt. Ltd.</strong> (RBI-regulated payment gateway). All data at rest is encrypted via AES-256; data in transit is protected via TLS 1.3.
            </p>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">4. Rights of the Data Principal (DPDP Act, 2023)</h2>
            <p>
              Under Sections 11–14 of the DPDP Act, you retain enforceable rights: Right to Access Information, Right to Correction & Erasure (72-hour complete purge upon request), Right to Withdraw Consent, and Right to Grievance Redressal.
            </p>
          </div>

          <div class="p-4 rounded bg-slate-900/80 border border-slate-800">
            <h2 class="text-lg font-serif font-bold text-white mb-1">5. Grievance Officer & Contact Information</h2>
            <p class="text-xs text-slate-300">
              Pursuant to Rule 5(9) of the IT (SPDI) Rules, 2011 and Section 13 of the DPDP Act, 2023:
            </p>
            <ul class="text-xs space-y-1 mt-2 font-mono text-slate-300">
              <li>Designation: Data Protection & Grievance Officer — Tark</li>
              <li>Platform: <a href="https://www.tark.live" class="text-amber-300 hover:underline">https://www.tark.live</a></li>
              <li>Email: <a href="mailto:support@tark.live" class="text-amber-300 hover:underline">support@tark.live</a></li>
              <li>SLA: 24-hour acknowledgement · 7-business-day resolution</li>
            </ul>
          </div>
        </section>

        <nav class="pt-8 mt-8 border-t border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
          <a href="/" class="text-amber-300 hover:underline">← Tark Arena Home</a>
          <a href="/terms" class="hover:text-slate-200">Terms of Service</a>
          <a href="/refund" class="hover:text-slate-200">Refund Policy</a>
        </nav>
      </main>
    `;
  } else if (type === 'terms') {
    title = 'Terms of Service & Platform License Agreement | Tark';
    description = 'Terms of service, platform license agreement, Section 52(1)(q) copyright provenance, and single-aspirant seat covenants for Tark.';
    canonicalUrl = 'https://www.tark.live/terms';

    semanticHtml = `
      <main class="max-w-4xl mx-auto px-4 py-12 text-neutral-100 font-sans leading-relaxed" data-ssr="true">
        <div class="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <a href="/" class="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#e0d0ab] hover:underline bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            ← Return to Tark War Room
          </a>
          <span class="text-[11px] font-mono text-slate-400">TARK STATUTORY COMPLIANCE SUITE</span>
        </div>
        <header class="border-b border-slate-800 pb-6 mb-8">
          <span class="inline-block px-3 py-1 bg-amber-950/60 border border-amber-500/40 rounded text-xs font-mono text-amber-300 font-medium mb-3">
            STATUTORY CHARTER // TARK-LEGAL-TOS-2026-V2.4
          </span>
          <h1 class="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">Terms of Service & Platform License Agreement</h1>
          <p class="text-xs font-mono text-slate-400 mt-2">
            Effective: October 14, 2026 · Jurisdiction: Republic of India · Indian Contract Act, 1872 & IT Act, 2000
          </p>
        </header>

        <section class="space-y-6 text-sm text-slate-300">
          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">1. Binding Agreement & Service Nature</h2>
            <p>
              By accessing, running a diagnostic on, or purchasing a lifetime seat on Tark (<a href="https://www.tark.live" class="text-[#e0d0ab] hover:underline">https://www.tark.live</a>), you enter into a legally binding contract under the <strong>Indian Contract Act, 1872</strong>. Tark provides timed examination simulations (+2.00 / −0.66), OMR discipline tracking, the 50:50 Risk Ledger, 130-node syllabus practice sets, and primary-source daily intelligence.
            </p>
            <div class="mt-3 p-3.5 bg-slate-900 border border-slate-800 rounded text-xs">
              <strong class="text-white block mb-1">Government Non-Affiliation Disclaimer:</strong>
              Tark is an independent private technology platform. It is not affiliated with, endorsed by, or connected to the Union Public Service Commission (UPSC), any State PSC, Press Information Bureau (PIB), or any Ministry of the Government of India.
            </div>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">2. 500-Seat Founding Cohort & Single-Aspirant Seat Restriction</h2>
            <p>
              Founding Cohort lifetime access is strictly limited to 500 seats. Each seat is licensed exclusively to <strong>one (1) natural person</strong>. Account pooling, credential sharing, or distributing session tokens across Telegram groups is a material breach resulting in immediate license revocation.
            </p>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">3. Intellectual Property & Section 52(1)(q) Provenance</h2>
            <ul class="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Historical Question Papers (2000–2025):</strong> Reproduced from public-record examinations conducted by the UPSC in strict accordance with <strong>Section 52(1)(q) of the Indian Copyright Act, 1957</strong>.</li>
              <li><strong>Government Releases:</strong> Daily Brief statements link directly to primary government gazettes, PIB releases, and PRS Legislative briefs.</li>
              <li><strong>Tark Proprietary Rights:</strong> The 130-node syllabus taxonomy, Examiner Trap syntheses, telemetry algorithms, 50:50 mathematical risk ledger, and source code are the copyrighted intellectual property of Tark.</li>
            </ul>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">4. Acceptable Use & Anti-Scraping Covenants</h2>
            <p>
              You covenant not to scrape questions using automated scripts, tamper with server-side evaluation APIs (<code class="text-[#e0d0ab]">SRV_EVAL</code>), or redistribute Tark's diagnostic analyses in commercial coaching materials or competing portals.
            </p>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">5. Limitation of Liability & Governing Law</h2>
            <p>
              Tark’s aggregate cumulative liability for any claim arising out of these Terms shall not exceed the amount paid by you (<strong>₹399</strong>). This Agreement is governed by the laws of the Republic of India, with jurisdiction in competent Indian courts, preserving statutory consumer protections under the Consumer Protection Act, 2019.
            </p>
          </div>
        </section>

        <nav class="pt-8 mt-8 border-t border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
          <a href="/" class="text-amber-300 hover:underline">← Tark Arena Home</a>
          <a href="/privacy" class="hover:text-slate-200">Privacy Policy</a>
          <a href="/refund" class="hover:text-slate-200">Refund Policy</a>
        </nav>
      </main>
    `;
  } else if (type === 'refund') {
    title = 'Refund, Cancellation & Lifetime Seat Allocation Policy | Tark';
    description = '7-day no-friction refund window, 24-48h Razorpay initiation, and 500-seat cohort ledger allocation terms for Tark.';
    canonicalUrl = 'https://www.tark.live/refund';

    semanticHtml = `
      <main class="max-w-4xl mx-auto px-4 py-12 text-neutral-100 font-sans leading-relaxed" data-ssr="true">
        <div class="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <a href="/" class="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#e0d0ab] hover:underline bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            ← Return to Tark War Room
          </a>
          <span class="text-[11px] font-mono text-slate-400">TARK STATUTORY COMPLIANCE SUITE</span>
        </div>
        <header class="border-b border-slate-800 pb-6 mb-8">
          <span class="inline-block px-3 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded text-xs font-mono text-cyan-400 font-medium mb-3">
            STATUTORY CHARTER // TARK-LEGAL-REF-2026-V2.4
          </span>
          <h1 class="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">Refund, Cancellation & Lifetime Seat Allocation Policy</h1>
          <p class="text-xs font-mono text-slate-400 mt-2">
            Effective: October 14, 2026 · Jurisdiction: Republic of India · Consumer Protection (E-Commerce) Rules, 2020 & RBI Directives
          </p>
        </header>

        <section class="space-y-6 text-sm text-slate-300">
          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">1. Philosophy: Try Before You Pay</h2>
            <p>
              Tark provides full access to the live timed +2.00 / −0.66 diagnostic on the landing page before any payment is requested. If you purchase one of the <strong>500 Lifetime Seats (₹399 one-time)</strong> and find it does not align with your study workflow, our refund policy is simple, transparent, and fair.
            </p>
          </div>

          <div class="p-4 rounded bg-slate-900 border border-emerald-500/30">
            <h2 class="text-lg font-serif font-bold text-emerald-400 mb-1">2. The 7-Day No-Friction Refund Window</h2>
            <p class="text-xs text-slate-300 leading-relaxed">
              You are entitled to a <strong>100% full refund of your ₹399 payment</strong> within seven (7) calendar days (168 hours) of purchase. No justification or retention hoops required: email <strong class="text-white">support@tark.live</strong> with your registered email and Razorpay payment ID.
            </p>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">3. Duplicate Payments & Technical Settlement Failures</h2>
            <p>
              If your bank account or UPI is debited multiple times due to a gateway timeout, Tark will immediately provision your seat or issue an <strong>unconditional 100% refund</strong> of the duplicate charge, regardless of the 7-day window.
            </p>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">4. Effect of Refund on 500-Seat Cohort Ledger</h2>
            <p>
              Because the Founding Cohort is strictly capped at 500 seats: upon refund initiation, your Lifetime Seat license is revoked, and the seat is immediately released back to the open inventory pool on <code class="text-amber-300">tark.live</code> (+1 open seat).
            </p>
          </div>

          <div>
            <h2 class="text-xl font-serif font-bold text-[#e0d0ab] mb-2">5. Disbursement Timelines & Zero Auto-Renewal Guarantee</h2>
            <ul class="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Razorpay Refund API Initiation:</strong> 24 to 48 hours from receipt of request.</li>
              <li><strong>Bank / UPI Account Credit:</strong> 5 to 7 business days, depending on issuing bank TAT.</li>
              <li><strong>Zero Deductions:</strong> Tark absorbs all gateway processing fees; you receive the full ₹399 back.</li>
              <li><strong>Zero Auto-Renewal:</strong> The ₹399 Lifetime Seat is a strict one-time transaction. No recurring subscriptions or UPI autopay mandates are ever created.</li>
            </ul>
          </div>

          <div class="p-4 rounded bg-slate-900/80 border border-slate-800">
            <h2 class="text-lg font-serif font-bold text-white mb-1">Contact for Refund Processing</h2>
            <p class="text-xs text-slate-300 font-mono">
              Email: <a href="mailto:support@tark.live" class="text-amber-300 hover:underline">support@tark.live</a> · SLA: 24-hour acknowledgement
            </p>
          </div>
        </section>

        <nav class="pt-8 mt-8 border-t border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
          <a href="/" class="text-amber-300 hover:underline">← Tark Arena Home</a>
          <a href="/privacy" class="hover:text-slate-200">Privacy Policy</a>
          <a href="/terms" class="hover:text-slate-200">Terms of Service</a>
        </nav>
      </main>
    `;
  }

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
