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
} from './bot-renderer.js';
import { INDEXNOW_KEY, submitToIndexNow } from './indexnow.js';

export const seoRouter = Router();

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

// 5. Programmatic GS Syllabus Hubs (/intelligence/gs-1, /intelligence/gs-2, /intelligence/gs-3, /intelligence/gs-4)
seoRouter.get(
  ['/intelligence/gs-:paper', '/news/gs-:paper'],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paper = req.params.paper || '1';
      const html = await renderGsHubSeoHtml(`gs-${paper}`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    } catch (err) {
      console.warn('[seo-router] Error rendering GS hub SEO:', err);
      return next();
    }
  }
);

// 6. Programmatic Ministry Hubs (/intelligence/ministry/:slug)
seoRouter.get(
  ['/intelligence/ministry/:slug', '/news/ministry/:slug'],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug || '';
      const html = await renderMinistryHubSeoHtml(slug);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    } catch (err) {
      console.warn('[seo-router] Error rendering ministry hub SEO:', err);
      return next();
    }
  }
);

// 7. Daily Edition Archive SSR (/daily-edition/:date and /daily-edition)
seoRouter.get('/daily-edition/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const html = await renderDailyEditionSeoHtml(req.params.date);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (err) {
    console.warn('[seo-router] Error rendering daily edition date SEO:', err);
    return next();
  }
});

seoRouter.get('/daily-edition', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const html = await renderDailyEditionSeoHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (err) {
    console.warn('[seo-router] Error rendering daily edition SEO:', err);
    return next();
  }
});

// 8. Intelligence & News Article Routes Handler
async function handleIntelligenceRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const queryId = typeof req.query.id === 'string' ? req.query.id : undefined;
    const article = await fetchArticleForSeo(req.path, queryId);

    if (article) {
      const html = renderSeoHtml(article, req.url);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    }

    const hubHtml = await renderHubSeoHtml('intelligence');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(hubHtml);
  } catch (err) {
    console.warn('[seo-router] Error rendering intelligence SEO:', err);
    return next();
  }
}

// 9. PRS Legislative Vault Routes Handler
async function handlePrsRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const queryId = typeof req.query.id === 'string' ? req.query.id : undefined;
    const article = await fetchArticleForSeo(req.path, queryId);

    if (article) {
      const html = renderSeoHtml(article, req.url);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    }

    const hubHtml = await renderHubSeoHtml('prs');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(hubHtml);
  } catch (err) {
    console.warn('[seo-router] Error rendering PRS SEO:', err);
    return next();
  }
}

seoRouter.get(['/intelligence', '/intelligence/:slug', '/news', '/news/:slug', '/current-affairs'], handleIntelligenceRoute);
seoRouter.get(['/prs', '/prs/:slug'], handlePrsRoute);

// 10. Legal & Statutory Compliance Routes (Privacy Policy, Terms of Service, Refund Policy)
seoRouter.get(
  ['/privacy', '/terms', '/refund', '/api/privacy', '/api/terms', '/api/refund'],
  (req: Request, res: Response) => {
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
