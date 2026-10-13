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
  <link rel="canonical" href="https://tark.live/" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

interface ArticleRecord {
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
    if (queryId) {
      const { data, error } = await supabase
        .from('current_affairs')
        .select('*')
        .eq('id', queryId)
        .maybeSingle();

      if (!error && data) return data as ArticleRecord;
    }

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
        if (!error && data) return data as ArticleRecord;
      }

      // Try looking up recent records to find match
      const { data, error } = await supabase
        .from('current_affairs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(250);

      if (!error && data) {
        const matched = data.find((d: any) => slugify(d.headline) === slug);
        if (matched) return matched as ArticleRecord;
      }
    }
  } catch (err) {
    console.warn('[bot-renderer] Supabase fetch error:', err);
  }

  return null;
}

export function renderSeoHtml(article: ArticleRecord, reqUrl: string): string {
  const baseHtml = getBaseHtml();
  const slug = slugify(article.headline);
  const canonicalUrl = `https://tark.live/intelligence/${slug}?id=${encodeURIComponent(article.id || '')}`;
  const pageTitle = `${article.headline} — UPSC Policy Intelligence & Prelims Analysis | Tark`;

  const bullets = article.summary?.bullets || [];
  const rawDesc = bullets.slice(0, 2).join(' ') || article.summary?.prelims || article.headline;
  const cleanDesc = rawDesc.replace(/[<>"']/g, '').slice(0, 220);

  const publishedIso = new Date(article.published_at || article.created_at || Date.now()).toISOString();
  const modifiedIso = publishedIso;

  const schemaJson = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        '@id': `${canonicalUrl}#article`,
        'isPartOf': {
          '@type': 'WebSite',
          '@id': 'https://tark.live/#website',
          'name': 'Tark | तर्क',
          'url': 'https://tark.live/'
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
          'url': 'https://tark.live/'
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'Tark',
          'url': 'https://tark.live/',
          'logo': {
            '@type': 'ImageObject',
            'url': 'https://tark.live/favicon.svg'
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
            'item': 'https://tark.live/'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Daily Intelligence',
            'item': 'https://tark.live/intelligence'
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': article.ministry || 'Policy',
            'item': canonicalUrl
          }
        ]
      }
    ]
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
        <a href="${escapeXml(article.url || 'https://tark.live')}" rel="nofollow noopener" target="_blank" class="text-[#e0d0ab] hover:underline">
          Original Wire Source ↗
        </a>
      </footer>

      <nav class="pt-4 mt-4 border-t border-slate-800/60 text-xs font-mono text-slate-400 flex flex-wrap gap-4">
        <a href="/intelligence" class="text-[#e0d0ab] hover:underline">← All Policy Signals</a>
        <a href="/daily-edition" class="hover:text-slate-200 hover:underline">Daily PIB Edition</a>
        <a href="/prs" class="hover:text-slate-200 hover:underline">PRS Legislative Vault</a>
        <a href="/arena" class="hover:text-slate-200 hover:underline">Practice Test Arena</a>
        <a href="/observatory" class="hover:text-slate-200 hover:underline">Question Observatory</a>
      </nav>
    </article>
  `;

  // Inject meta tags and replace title
  let modifiedHtml = baseHtml;

  // Replace Title
  modifiedHtml = modifiedHtml.replace(
    /<title>.*?<\/title>/i,
    `<title>${escapeXml(pageTitle)}</title>`
  );

  // Replace Meta Description
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${escapeXml(cleanDesc)}" />`
  );

  // Replace or Inject Canonical URL
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

  // Replace Open Graph Tags
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

  // Inject Article Specific OG Tags & Schema
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

  // Inject Semantic Article into #root
  modifiedHtml = modifiedHtml.replace(
    /<div\s+id=["']root["']>[\s\S]*?<\/div>/i,
    `<div id="root">${semanticArticleHtml}</div>`
  );

  return modifiedHtml;
}

export async function renderHubSeoHtml(section: 'intelligence' | 'prs' | 'daily-edition'): Promise<string> {
  const baseHtml = getBaseHtml();
  const supabase = getSupabaseClient();

  let title = 'Daily UPSC Current Affairs & Policy Intelligence | Tark';
  let description = 'Autonomous policy & governance intelligence distilled directly from official PIB releases, Cabinet decisions, and The Hindu for UPSC CSE and State PSC prep.';
  let canonicalUrl = 'https://tark.live/intelligence';
  let h1 = 'Daily Policy & Governance Intelligence';
  let itemsHtml = '';

  if (section === 'prs') {
    title = 'PRS Legislative Vault — Parliamentary Acts & Bills Analysis | Tark';
    description = 'Dedicated statutory and policy intelligence archive containing deep analytical breakdowns of Parliamentary Bills, Acts, and Constitutional doctrines.';
    canonicalUrl = 'https://tark.live/prs';
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
  } else if (section === 'daily-edition') {
    title = 'Daily Curated PIB Edition | Tark Intelligence';
    description = 'Finite, verified daily briefing of high-impact government policy notifications and news for UPSC aspirants.';
    canonicalUrl = 'https://tark.live/daily-edition';
    h1 = 'Daily Curated Policy Edition';
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
