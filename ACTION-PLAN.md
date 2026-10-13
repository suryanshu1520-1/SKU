# Action Plan

- URL: `https://tark.live`
- Overall score: `63/100`

## Priority Fixes

1. **No Organization/Person entity found in JSON-LD.**
   - Priority: `Critical`
   - Area: `Schema`
   - Evidence: See audit output.
   - Fix: Add Organization or Person schema with name, url, logo, and sameAs properties.
2. **Missing H1 on page**
   - Priority: `Critical`
   - Area: `environment`
   - Evidence: No primary content heading was detected, which weakens topical clarity.
   - Fix: Ensure each page has exactly one descriptive H1 aligned to intent.
3. **5 security headers missing**
   - Priority: `Critical`
   - Area: `environment`
   - Evidence: Missing headers reduce trust and can expose the site to browser/security risks.
   - Fix: Set missing security headers at web server or CDN layer.
4. **19 orphan page(s) with zero inbound internal links.**
   - Priority: `Critical`
   - Area: `link_profile`
   - Evidence: See audit output.
   - Fix: Add internal links from relevant content pages to these orphan pages.
5. **Average internal links per page is only 2.4 (target: 5-10).**
   - Priority: `Critical`
   - Area: `link_profile`
   - Evidence: See audit output.
   - Fix: Increase internal linking by adding contextual links within content.
6. **Meta description is missing or out of range**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: This can reduce SERP CTR and snippet quality.
   - Fix: Update page templates to set complete title/meta/OG/Twitter tags.
7. **Title tag needs optimization**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: Title length/content is likely suboptimal for rankings and click-through.
   - Fix: Update page templates to set complete title/meta/OG/Twitter tags.
8. **Content readability is difficult**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: Long, complex text can reduce engagement and comprehension.
   - Fix: Rewrite key sections with shorter sentences (15-20 words), shorter paragraphs (2-4 sentences), and clearer subheadings.
9. **17 page(s) with no outbound internal links (dead ends).**
   - Priority: `Warning`
   - Area: `link_profile`
   - Evidence: See audit output.
   - Fix: Add contextual internal links to related content from these pages.
10. **Missing sameAs link to Wikipedia (Primary KG signal).**
   - Priority: `Warning`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add the existing official 'wikipedia.org' URL to sameAs; do not create this profile solely for SEO.
11. **Missing sameAs link to Wikidata (Primary KG signal).**
   - Priority: `Warning`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add the existing official 'wikidata.org' URL to sameAs; do not create this profile solely for SEO.
12. **No Wikidata entry found for 'Tark \| तर्क'.**
   - Priority: `Info`
   - Area: `Wikidata`
   - Evidence: See audit output.
   - Fix: If the entity meets Wikidata notability guidelines, create or improve an item with accurate third-party references. Do not create one solely for SEO.
13. **Performance measurement incomplete**
   - Priority: `Info`
   - Area: `environment`
   - Evidence: PageSpeed API returned an error, so CWV recommendations are less reliable.
   - Fix: Set `PAGESPEED_API_KEY` in your environment or `.env` file (see `.env.example`), then rerun. The CLI also accepts `--api-key`. Prioritize LCP/INP/CLS fixes from that output.
14. **Missing sameAs link to LinkedIn (Strong KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add 'linkedin.com' profile URL to sameAs array in your entity schema.
15. **Missing sameAs link to Twitter/X (Strong KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add 'x.com' profile URL to sameAs array in your entity schema.
