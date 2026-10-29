/**
 * src/lib/syllabus-tagger.ts
 *
 * Infers and formats authentic UPSC General Studies syllabus tags
 * (GS-I, GS-II, GS-III, GS-IV) and topic labels for Tark news signals.
 */

export interface ArticleSyllabusTag {
  paper: string;
  topic: string;
  badge: string;
}

export function deriveArticleSyllabusTag(item: {
  source?: string | null;
  ministry?: string | null;
  headline?: string | null;
  tags?: string[] | null;
  node_id?: string | null;
}): ArticleSyllabusTag {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const text = `${item.headline || ''} ${item.ministry || ''} ${item.source || ''}`.toLowerCase();
  const source = (item.source || '').toUpperCase();
  const ministry = (item.ministry || '').toLowerCase();

  // 1. Explicit tags provided on item
  if (tags.length > 0 && tags[0]) {
    const raw = tags[0].trim();
    const match = raw.match(/^(GS[- ]?(?:I{1,3}|IV|[1-4])|CSAT|ESSAY|PRELIMS|MAINS)[:\s-]*(.*)/i);
    if (match) {
      let paper = match[1].toUpperCase().replace(/\s+/, '-');
      paper = paper
        .replace(/GS-?1\b/i, 'GS-I')
        .replace(/GS-?2\b/i, 'GS-II')
        .replace(/GS-?3\b/i, 'GS-III')
        .replace(/GS-?4\b/i, 'GS-IV');

      const remainder = match[2].trim();
      let topic = 'General Studies';
      if (/agriculture|farmer|crop|soil|icar|kvk|msp/i.test(remainder)) topic = 'Agriculture';
      else if (/economy|banking|finance|fiscal|growth|rbi/i.test(remainder)) topic = 'Economy';
      else if (/science|technology|space|ai|it\b|isro/i.test(remainder)) topic = 'Science & Tech';
      else if (/environment|climate|pollution|renewable|hydrogen/i.test(remainder)) topic = 'Environment';
      else if (/constitution|polity|parliament|governance|judiciary|law/i.test(remainder)) topic = 'Polity';
      else if (/health|education|social|women|child|tribal/i.test(remainder)) topic = 'Social Justice';
      else if (/security|defence|cyber|border/i.test(remainder)) topic = 'Security';
      else if (/international|bilateral|diplomacy|treaty/i.test(remainder)) topic = 'International Relations';
      else if (/culture|heritage|history|art\b/i.test(remainder)) topic = 'Culture';
      else if (/ethics|integrity|corporate governance/i.test(remainder)) topic = 'Ethics';
      else if (remainder) {
        topic = remainder.split(/[-–;,]/)[0].trim().slice(0, 18);
      }

      return { paper, topic, badge: `${paper} · ${topic}` };
    }
  }

  // 2. Node ID prefix mapping
  if (item.node_id) {
    if (item.node_id.startsWith('GS1')) return { paper: 'GS-I', topic: 'Culture & Society', badge: 'GS-I · Culture & Society' };
    if (item.node_id.startsWith('GS2.IR')) return { paper: 'GS-II', topic: 'International Relations', badge: 'GS-II · IR' };
    if (item.node_id.startsWith('GS2')) return { paper: 'GS-II', topic: 'Polity & Governance', badge: 'GS-II · Polity & Governance' };
    if (item.node_id.startsWith('GS3.ECO')) return { paper: 'GS-III', topic: 'Economy & Banking', badge: 'GS-III · Economy' };
    if (item.node_id.startsWith('GS3.AGRI')) return { paper: 'GS-III', topic: 'Agriculture', badge: 'GS-III · Agriculture' };
    if (item.node_id.startsWith('GS3.SCI')) return { paper: 'GS-III', topic: 'Science & Technology', badge: 'GS-III · Science & Tech' };
    if (item.node_id.startsWith('GS3.ENV')) return { paper: 'GS-III', topic: 'Environment & Climate', badge: 'GS-III · Environment' };
    if (item.node_id.startsWith('GS3.DEF')) return { paper: 'GS-III', topic: 'Internal Security', badge: 'GS-III · Security' };
    if (item.node_id.startsWith('GS4')) return { paper: 'GS-IV', topic: 'Ethics & Integrity', badge: 'GS-IV · Ethics' };
  }

  // 3. Domain heuristic based on Ministry, Source and Headline
  if (source === 'RBI' || /banking|monetary policy|repo rate|nbfc|liquidity|g-sec|forex/i.test(text)) {
    return { paper: 'GS-III', topic: 'Economy & Banking', badge: 'GS-III · Economy' };
  }

  if (/agriculture|farmer|soil health|icar|kvk|rabi|kharif|msp|pm-kisan/i.test(text) || /agriculture/i.test(ministry)) {
    return { paper: 'GS-III', topic: 'Agriculture', badge: 'GS-III · Agriculture' };
  }

  if (/green hydrogen|renewable energy|solar|wind|carbon|pollution|emission|forest|wildlife|biodiversity/i.test(text) || /environment|renewable/i.test(ministry)) {
    return { paper: 'GS-III', topic: 'Energy & Ecology', badge: 'GS-III · Energy & Ecology' };
  }

  if (/space|isro|spadex|nglv|satellite|semiconductor|quantum|artificial intelligence|drdo/i.test(text) || /space|electronics/i.test(ministry)) {
    return { paper: 'GS-III', topic: 'Science & Tech', badge: 'GS-III · Science & Tech' };
  }

  if (/culture|manuscript|heritage|monument|unesco|archaeological|museum/i.test(text) || /culture/i.test(ministry)) {
    return { paper: 'GS-I', topic: 'Culture & Heritage', badge: 'GS-I · Culture' };
  }

  if (/external affairs|bilateral|mou with|foreign policy|admm-plus|embassy|consulate|diplomatic/i.test(text) || /external affairs/i.test(ministry)) {
    return { paper: 'GS-II', topic: 'International Relations', badge: 'GS-II · IR' };
  }

  if (/women|child|poshan|health|hospital|education|ayushman|social justice|tribal|welfare/i.test(text) || /women|health|social justice|education/i.test(ministry)) {
    return { paper: 'GS-II', topic: 'Social Justice & Health', badge: 'GS-II · Social Justice' };
  }

  if (/defence|army|navy|air force|coast guard|military|border peace/i.test(text) || /defence/i.test(ministry)) {
    return { paper: 'GS-III', topic: 'Security & Defence', badge: 'GS-III · Defence' };
  }

  if (/cyclone|disaster|flood|earthquake|ndrf/i.test(text)) {
    return { paper: 'GS-III', topic: 'Disaster Management', badge: 'GS-III · Disaster Mgmt' };
  }

  if (source === 'PRS' || /parliament|bill|act|supreme court|high court|office of profit|election|ordinance|constitution/i.test(text) || /parliament|law/i.test(ministry)) {
    return { paper: 'GS-II', topic: 'Polity & Governance', badge: 'GS-II · Polity & Governance' };
  }

  return { paper: 'GS-II', topic: 'Governance', badge: 'GS-II · Governance' };
}

