import { Router, Request, Response, NextFunction } from 'express';
import { generateMainSitemap, generateNewsSitemap } from './sitemap.js';
import { fetchArticleForSeo, renderSeoHtml, renderHubSeoHtml } from './bot-renderer.js';

export const seoRouter = Router();

// 1. Dynamic Main XML Sitemap
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

// 2. Dynamic Google News XML Sitemap
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

// 3. Intelligence & News Routes Handler
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

// 4. PRS Legislative Vault Routes Handler
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

// 5. Daily Edition Routes Handler
async function handleDailyEditionRoute(_req: Request, res: Response, next: NextFunction) {
  try {
    const hubHtml = await renderHubSeoHtml('daily-edition');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(hubHtml);
  } catch (err) {
    console.warn('[seo-router] Error rendering daily edition SEO:', err);
    return next();
  }
}

seoRouter.get(['/intelligence', '/intelligence/:slug', '/news', '/news/:slug', '/current-affairs'], handleIntelligenceRoute);
seoRouter.get(['/prs', '/prs/:slug'], handlePrsRoute);
seoRouter.get(['/daily-edition', '/daily-edition/:date'], handleDailyEditionRoute);
