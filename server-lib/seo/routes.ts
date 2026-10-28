import { Router, Request, Response, NextFunction } from 'express';
import { generateMainSitemap, generateNewsSitemap, getAllSitemapUrls } from './sitemap.js';
import {
  fetchArticleForSeo,
  renderSeoHtml,
  renderHubSeoHtml,
  renderGsHubSeoHtml,
  renderMinistryHubSeoHtml,
  renderDailyEditionSeoHtml,
  renderLegalSeoHtml,
  getBaseHtml,
} from './bot-renderer.js';
import { INDEXNOW_KEY, submitToIndexNow } from './indexnow.js';

export const seoRouter = Router();

function shouldServeSeoHtml(req: Request): boolean {
  if (req.query.seo === 'true' || req.query.seo === '1') return true;
  if (process.env.NODE_ENV === 'production') return true;
  const ua = req.headers['user-agent'] || '';
  return /googlebot|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator|whatsapp/i.test(ua);
}

// 1. IndexNow Verification Key Route
seoRouter.get([`/${INDEXNOW_KEY}.txt`, `/api/${INDEXNOW_KEY}.txt`], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(INDEXNOW_KEY);
});

// 2. IndexNow Real-Time Instant Ping Trigger Endpoint
seoRouter.post('/api/seo/indexnow', async (req: Request, res: Response) => {
  try {
    const { urls, submitAll } = req.body || {};

    let targetUrls: string[] = Array.isArray(urls) ? urls : [];

    if (submitAll || targetUrls.length === 0) {
      const sitemapUrls = await getAllSitemapUrls();
      // Submit up to 500 top priority URLs
      targetUrls = sitemapUrls.slice(0, 500);
    }

    const result = await submitToIndexNow(targetUrls);
    return res.status(result.ok ? 200 : 500).json(result);
  } catch (err: any) {
    console.error('[seo-router] IndexNow manual trigger error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Failed to submit' });
  }
});

// 3. Dynamic Main XML Sitemap
seoRouter.get(['/sitemap.xml', '/api/sitemap.xml'], async (_req: Request, res: Response) => {
  try {
    const xml = await generateMainSitemap();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error('[seo-router] Error generating main sitemap:', err);
    return res.status(500).send('<!-- Error generating sitemap -->');
  }
});

// 4. Dynamic Google News XML Sitemap
seoRouter.get(['/sitemap-news.xml', '/api/sitemap-news.xml'], async (_req: Request, res: Response) => {
  try {
    const xml = await generateNewsSitemap();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error('[seo-router] Error generating news sitemap:', err);
    return res.status(500).send('<!-- Error generating news sitemap -->');
  }
});

// Timeout protection helper to ensure Googlebot and clients never hit Vercel 504 / 500
async function safeRender(renderFn: () => Promise<string>, fallbackHtml: string, maxMs = 3500): Promise<string> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<string>((resolve) => {
    timer = setTimeout(() => resolve(fallbackHtml), maxMs);
  });
  try {
    return await Promise.race([renderFn(), timeoutPromise]);
  } catch (err) {
    console.warn('[seo-router] safeRender error fallback:', err);
    return fallbackHtml;
  } finally {
    clearTimeout(timer!);
  }
}

const MINISTRY_ALIASES: Record<string, string> = {
  'ministry-of-commerce-and-industry': 'ministry-of-commerce-industry',
  'ministry-of-law-and-justice': 'ministry-of-law-justice',
  'ministry-of-youth-affairs-and-sports': 'ministry-of-youth-affairs-sports',
  'election-commission': 'election-commission-of-india',
  'parliamentary-affairs': 'ministry-of-parliamentary-affairs',
};

// 5. Programmatic GS Syllabus Hubs (/intelligence/gs-1, /intelligence/gs-2, /intelligence/gs-3, /intelligence/gs-4)
seoRouter.get(
  ['/intelligence/gs-:paper', '/news/gs-:paper'],
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!shouldServeSeoHtml(req)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(getBaseHtml());
    }
    const paper = req.params.paper || '1';
    const html = await safeRender(
      () => renderGsHubSeoHtml(`gs-${paper}`),
      getBaseHtml()
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  }
);

// 6. Programmatic Ministry Hubs (/intelligence/ministry/:slug)
seoRouter.get(
  ['/intelligence/ministry/:slug', '/news/ministry/:slug'],
  async (req: Request, res: Response, _next: NextFunction) => {
    const rawSlug = req.params.slug || '';
    if (MINISTRY_ALIASES[rawSlug]) {
      return res.redirect(301, `/intelligence/ministry/${MINISTRY_ALIASES[rawSlug]}`);
    }

    if (!shouldServeSeoHtml(req)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(getBaseHtml());
    }

    const html = await safeRender(
      () => renderMinistryHubSeoHtml(rawSlug),
      getBaseHtml()
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  }
);

// 7. Daily Edition Archive SSR (/daily-edition/:date and /daily-edition)
seoRouter.get('/daily-edition/:date', async (req: Request, res: Response, _next: NextFunction) => {
  if (!shouldServeSeoHtml(req)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(getBaseHtml());
  }
  const dateStr = req.params.date;
  const html = await safeRender(
    () => renderDailyEditionSeoHtml(dateStr),
    getBaseHtml()
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
});

seoRouter.get('/daily-edition', async (req: Request, res: Response, _next: NextFunction) => {
  if (!shouldServeSeoHtml(req)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(getBaseHtml());
  }
  const html = await safeRender(
    () => renderDailyEditionSeoHtml(),
    getBaseHtml()
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
});

// 8. Intelligence & News Article Routes Handler
async function handleIntelligenceRoute(req: Request, res: Response, _next: NextFunction) {
  if (!shouldServeSeoHtml(req)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(getBaseHtml());
  }
  const html = await safeRender(
    async () => {
      const queryId = typeof req.query.id === 'string' ? req.query.id : undefined;
      const article = await fetchArticleForSeo(req.path, queryId);
      if (article) {
        return renderSeoHtml(article, req.url);
      }
      return renderHubSeoHtml('intelligence');
    },
    getBaseHtml()
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}

// 9. PRS Legislative Vault Routes Handler
async function handlePrsRoute(req: Request, res: Response, _next: NextFunction) {
  if (!shouldServeSeoHtml(req)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(getBaseHtml());
  }
  const html = await safeRender(
    async () => {
      const queryId = typeof req.query.id === 'string' ? req.query.id : undefined;
      const article = await fetchArticleForSeo(req.path, queryId);
      if (article) {
        return renderSeoHtml(article, req.url);
      }
      return renderHubSeoHtml('prs');
    },
    getBaseHtml()
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}

seoRouter.get(['/intelligence', '/intelligence/:slug', '/news', '/news/:slug', '/current-affairs'], handleIntelligenceRoute);
seoRouter.get(['/prs', '/prs/:slug'], handlePrsRoute);

// 10. Legal & Statutory Compliance Routes (Privacy Policy, Terms of Service, Refund Policy)
seoRouter.get(
  ['/privacy', '/terms', '/refund', '/api/privacy', '/api/terms', '/api/refund'],
  (req: Request, res: Response, _next: NextFunction) => {
    if (!shouldServeSeoHtml(req)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(getBaseHtml());
    }
    const path = req.path.toLowerCase();
    let type: 'privacy' | 'terms' | 'refund' = 'privacy';
    if (path.includes('terms')) type = 'terms';
    else if (path.includes('refund')) type = 'refund';

    const html = renderLegalSeoHtml(type);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(html);
  }
);

// 11. Core Platform Hub Routes (Self-Referencing Canonical Hubs)
const HUB_ROUTES: Record<string, Parameters<typeof renderHubSeoHtml>[0]> = {
  '/observatory': 'observatory',
  '/syllabus': 'syllabus',
  '/arena': 'arena',
  '/thinkers': 'thinkers',
  '/humanities': 'humanities',
  '/manifesto': 'manifesto',
  '/sources': 'sources',
  '/leaderboard': 'leaderboard',
  '/library': 'library',
};

for (const [routePath, section] of Object.entries(HUB_ROUTES)) {
  seoRouter.get([routePath, `${routePath}/:sub*`], async (req: Request, res: Response, _next: NextFunction) => {
    if (!shouldServeSeoHtml(req)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(getBaseHtml());
    }
    try {
      const html = await renderHubSeoHtml(section);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    } catch (err) {
      console.warn(`[seo-router] Error rendering hub ${section}:`, err);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(getBaseHtml());
    }
  });
}
