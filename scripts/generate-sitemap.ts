import fs from 'fs';
import path from 'path';
import { generateMainSitemap } from '../server-lib/seo/sitemap.js';

async function main() {
  try {
    const xml = await generateMainSitemap();
    const targetPath = path.resolve(process.cwd(), 'public/sitemap.xml');
    
    // Ensure strict UTF-8 without BOM (byte offset 0 is '<?xml')
    fs.writeFileSync(targetPath, xml, { encoding: 'utf-8' });
    console.log(`[generate-sitemap] Successfully wrote clean BOM-free public/sitemap.xml (${xml.length} bytes)`);
  } catch (err) {
    console.error('[generate-sitemap] Error generating sitemap:', err);
    // Don't crash build if DB is unavailable; preserve existing sitemap if present
    const targetPath = path.resolve(process.cwd(), 'public/sitemap.xml');
    if (!fs.existsSync(targetPath)) {
      console.warn('[generate-sitemap] Creating emergency fallback sitemap');
      const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.tark.live/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.tark.live/intelligence</loc><changefreq>hourly</changefreq><priority>0.95</priority></url>
  <url><loc>https://www.tark.live/intelligence/international</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.tark.live/daily-edition</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.tark.live/prs</loc><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>https://www.tark.live/arena</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.tark.live/syllabus</loc><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>https://www.tark.live/thinkers</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.tark.live/observatory</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.tark.live/manifesto</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://www.tark.live/sources</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.tark.live/privacy</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://www.tark.live/terms</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://www.tark.live/refund</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
</urlset>`;
      fs.writeFileSync(targetPath, fallback, { encoding: 'utf-8' });
    }
  }
}

main();
