export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function getArticleUrl(item: { id?: string; headline: string }): string {
  const slug = slugify(item.headline);
  if (item.id) {
    return `/intelligence/${slug}?id=${encodeURIComponent(item.id)}`;
  }
  return `/intelligence/${slug}`;
}

export function getCanonicalArticleUrl(item: { id?: string; headline: string }): string {
  const rel = getArticleUrl(item);
  return `https://www.tark.live${rel}`;
}

export function getDailyEditionUrl(date?: string): string {
  if (date) return `/daily-edition/${encodeURIComponent(date)}`;
  return `/daily-edition`;
}

export function getPrsUrl(id: string): string {
  return `/prs/${encodeURIComponent(id)}`;
}

export interface RouteMetaConfig {
  title: string;
  description?: string;
  canonicalPath?: string;
}

export const ROUTE_META_DEFAULTS: Record<string, RouteMetaConfig> = {
  home: {
    title: 'Tark | तर्क — Authentic UPSC Prelims Arena (-0.66) & Verified Daily PIB Intelligence',
    description: 'Timed civil services mock test arena calibrated strictly to UPSC negative marking (+2.00 / -0.66) with diagnostic autopsies. Daily policy briefs from official PIB and Gazette releases. Zero hallucinations. Wire-verified evidence.',
    canonicalPath: '/',
  },
  tracker: {
    title: 'Daily UPSC Current Affairs & Policy Intelligence | Tark',
    description: 'Autonomous policy & governance intelligence distilled directly from official PIB releases, Cabinet decisions, and The Hindu for UPSC CSE and State PSC prep.',
    canonicalPath: '/intelligence',
  },
  gs1: {
    title: 'UPSC GS 1 Current Affairs & Static Linkages | Heritage, Geography & Society | Tark',
    description: 'High-yield current affairs dossiers and Prelims MCQs mapped strictly to UPSC GS-1 syllabus: Indian Heritage, Modern History, Geography, and Social Demographics.',
    canonicalPath: '/intelligence/gs-1',
  },
  gs2: {
    title: 'UPSC GS 2 Current Affairs, Polity & Governance | Constitution, Bills & IR | Tark',
    description: 'Comprehensive policy intelligence and Prelims MCQs mapped to UPSC GS-2: Indian Constitution, Parliament, Federalism, Statutory Bodies, Social Justice, and International Relations.',
    canonicalPath: '/intelligence/gs-2',
  },
  gs3: {
    title: 'UPSC GS 3 Current Affairs | Economy, Sci-Tech, Environment & Security | Tark',
    description: 'Analytical coverage and Prelims practice MCQs mapped to UPSC GS-3: Indian Economy, Agriculture, Science & Tech, Biodiversity, Climate Policy, and Internal Security.',
    canonicalPath: '/intelligence/gs-3',
  },
  gs4: {
    title: 'UPSC GS 4 Ethics, Integrity & Aptitude Current Affairs | Case Studies | Tark',
    description: 'Ethical analysis, administrative dilemmas, and civil service values applied to contemporary governance events for UPSC GS-4 Ethics & Case Studies.',
    canonicalPath: '/intelligence/gs-4',
  },
  edition: {
    title: 'Daily Curated PIB Edition | Tark Intelligence',
    description: 'Finite, verified daily briefing of high-impact government policy notifications and news for UPSC aspirants.',
    canonicalPath: '/daily-edition',
  },
  prs: {
    title: 'PRS Legislative Vault — Parliamentary Acts & Bills Analysis | Tark',
    description: 'Dedicated statutory and policy intelligence archive containing deep analytical breakdowns of Parliamentary Bills, Acts, and Constitutional doctrines.',
    canonicalPath: '/prs',
  },
  arena: {
    title: 'Competitive Test Arena & Prelims Simulator | Tark',
    description: 'Timed high-stakes examination simulator calibrated with authentic negative marking (+2.00 / -0.66) and server-side autopsies.',
    canonicalPath: '/arena',
  },
  observatory: {
    title: '25-Year UPSC Question Observatory & High-Yield Matrix | Tark',
    description: 'Explore two and a half decades of UPSC Civil Services Prelims questions categorized by subject, theme, and examiner cognitive depth.',
    canonicalPath: '/observatory',
  },
  humanities: {
    title: 'Primary Thinkers & Humanities Deep Reader | Tark',
    description: 'Unfiltered primary philosophy, political theory, and historical texts for deep analytical foundations in UPSC Mains.',
    canonicalPath: '/humanities',
  },
  leaderboard: {
    title: 'Live Candidate Leaderboard & Rankings | Tark',
    description: 'Real-time percentile rankings, daily streaks, and analytical scores across competitive examination aspirants.',
    canonicalPath: '/leaderboard',
  },
  profile: {
    title: 'Candidate Dossier & Saved Signals | Tark',
    description: 'Track your personal examination accuracy, cognitive pacing, and saved policy signals.',
    canonicalPath: '/profile',
  },
  manifesto: {
    title: 'The Tark Manifesto — The War on Noise in Civil Services Preparation | Tark',
    description: 'Our educational philosophy: sterile testing arenas, deterministic evaluation, and signal-rich intelligence free from commercial noise.',
    canonicalPath: '/manifesto',
  },
  privacy: {
    title: 'Privacy Policy & Data Governance Charter | Tark',
    description: 'Digital Personal Data Protection Act (DPDP Act 2023) compliant privacy policy. Zero ads, zero tracking pixels, zero candidate data monetization.',
    canonicalPath: '/privacy',
  },
  terms: {
    title: 'Terms of Service & Platform License Agreement | Tark',
    description: 'Terms of service, platform license agreement, Section 52(1)(q) copyright provenance, and single-aspirant seat covenants for Tark.',
    canonicalPath: '/terms',
  },
  refund: {
    title: 'Refund, Cancellation & Lifetime Seat Allocation Policy | Tark',
    description: '7-day no-friction refund window, 24-48h Razorpay initiation, and 500-seat cohort ledger allocation terms for Tark.',
    canonicalPath: '/refund',
  },
};

export function updateDocumentMeta(config: RouteMetaConfig): void {
  if (typeof document === 'undefined') return;

  // 1. Update Title
  if (config.title) {
    document.title = config.title;
  }

  // 2. Update Description
  if (config.description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', config.description);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', config.description);
  }

  // 3. Update Canonical Link
  if (config.canonicalPath) {
    const fullCanonical = config.canonicalPath.startsWith('http')
      ? config.canonicalPath
      : `https://www.tark.live${config.canonicalPath.startsWith('/') ? config.canonicalPath : '/' + config.canonicalPath}`;

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullCanonical);

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', fullCanonical);
  }
}
