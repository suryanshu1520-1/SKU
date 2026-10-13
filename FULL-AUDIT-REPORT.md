# Full Audit Report

- URL: `https://tark.live`
- Generated: `2026-10-13T19:19:02.492797`
- Overall score: `63/100`
- Score confidence: `Medium`
- Scoring version: `1`

## Score Card

| Category | Weight | Score |
| --- | ---: | ---: |
| Security Headers | 8 | 45 |
| Social Meta | 5 | 85 |
| Robots and Crawlers | 8 | 80 |
| Broken Links | 10 | 100 |
| Internal Links | 8 | 80 |
| Redirects | 3 | 100 |
| AI Search | 5 | 5 |
| Performance and Core Web Vitals | 13 | 0 |
| On-Page SEO | 10 | 90 |
| Readability | 8 | 45 |
| Entity SEO | 5 | 0 |
| Link Profile | 7 | 5 |
| Hreflang | 5 | 0 |
| Content Uniqueness | 5 | 100 |

## Findings

| Severity | Area | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| Critical | Schema | No Organization/Person entity found in JSON-LD. |  | Add Organization or Person schema with name, url, logo, and sameAs properties. |
| Critical | environment | Missing H1 on page | No primary content heading was detected, which weakens topical clarity. | Ensure each page has exactly one descriptive H1 aligned to intent. |
| Critical | environment | 5 security headers missing | Missing headers reduce trust and can expose the site to browser/security risks. | Set missing security headers at web server or CDN layer. |
| Critical | link_profile | 19 orphan page(s) with zero inbound internal links. |  | Add internal links from relevant content pages to these orphan pages. |
| Critical | link_profile | Average internal links per page is only 2.4 (target: 5-10). |  | Increase internal linking by adding contextual links within content. |
| Critical | security | 🔴 5 security headers missing — poor security posture |  |  |
| Warning | broken_links | ⚠️ No links found on page |  |  |
| Warning | environment | Meta description is missing or out of range | This can reduce SERP CTR and snippet quality. | Update page templates to set complete title/meta/OG/Twitter tags. |
| Warning | environment | Title tag needs optimization | Title length/content is likely suboptimal for rankings and click-through. | Update page templates to set complete title/meta/OG/Twitter tags. |
| Warning | environment | Content readability is difficult | Long, complex text can reduce engagement and comprehension. | Rewrite key sections with shorter sentences (15-20 words), shorter paragraphs (2-4 sentences), and clearer subheadings. |
| Warning | internal_links | ⚠️ 1 page(s) have fewer than 3 internal links |  |  |
| Warning | link_profile | 17 page(s) with no outbound internal links (dead ends). |  | Add contextual internal links to related content from these pages. |
| Warning | readability | ⚠️ Content is difficult to read (Flesch: 27.5) — may reduce engagement |  |  |
| Warning | readability | ⚠️ 30.0% complex words (3+ syllables) — consider simplifying |  |  |
| Warning | readability | ⚠️ Thin content (10 words) — may rank poorly |  |  |
| Warning | robots | ⚠️ 11 AI crawlers not explicitly managed: GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended |  |  |
| Warning | sameAs | Missing sameAs link to Wikipedia (Primary KG signal). |  | Add the existing official 'wikipedia.org' URL to sameAs; do not create this profile solely for SEO. |
| Warning | sameAs | Missing sameAs link to Wikidata (Primary KG signal). |  | Add the existing official 'wikidata.org' URL to sameAs; do not create this profile solely for SEO. |
| Warning | security | ⚠️ HSTS missing includeSubDomains directive |  |  |
| Info | Wikidata | No Wikidata entry found for 'Tark \| तर्क'. |  | If the entity meets Wikidata notability guidelines, create or improve an item with accurate third-party references. Do not create one solely for SEO. |
| Info | environment | Performance measurement incomplete | PageSpeed API returned an error, so CWV recommendations are less reliable. | Set `PAGESPEED_API_KEY` in your environment or `.env` file (see `.env.example`), then rerun. The CLI also accepts `--api-key`. Prioritize LCP/INP/CLS fixes from that output. |
| info | pagespeed | pagespeed measurement incomplete | Rate limited by Google API. Wait a few minutes or add an API key. | Rerun this check after resolving the environment/API/network limitation. |
| Info | sameAs | Missing sameAs link to LinkedIn (Strong KG signal). |  | Add 'linkedin.com' profile URL to sameAs array in your entity schema. |
| Info | sameAs | Missing sameAs link to Twitter/X (Strong KG signal). |  | Add 'x.com' profile URL to sameAs array in your entity schema. |

## Measurement Notes

1 checks returned errors or incomplete measurements; treat affected scores as directional.
