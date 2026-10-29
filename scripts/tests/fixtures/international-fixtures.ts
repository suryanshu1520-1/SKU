/**
 * scripts/tests/fixtures/international-fixtures.ts
 *
 * Phase 0 Evaluation Fixtures.
 *
 * Provides repeatable test records across official primary sources,
 * admitted international candidates, non-official wire sources, and UPSC trap edge cases.
 */

export interface CandidateFixture {
  id: string;
  sourceId: string;
  sourceUrl: string;
  title: string;
  pubDate: string;
  body: string;
  expectedScope: 'india' | 'international' | 'cross_border';
  expectedRole: 'official_record' | 'institutional_news' | 'independent_reporting' | 'discovery';
  isOfficialHost: boolean;
  isUpscTrap?: boolean;
  trapNote?: string;
}

export const DOMESTIC_BASELINE_FIXTURES: CandidateFixture[] = [
  {
    id: "pib-cabinet-decision",
    sourceId: "PIB",
    sourceUrl: "https://pib.gov.in/PressReleasePage.aspx?PRID=2069812",
    title: "Cabinet approves National Clean Energy Corridor Scheme Phase III",
    pubDate: "2026-10-28T10:30:00.000Z",
    body: "The Union Cabinet chaired by Prime Minister approved the National Clean Energy Corridor Scheme Phase III with an outlay of INR 18,500 crore to evacuate renewable energy from western states.",
    expectedScope: "india",
    expectedRole: "official_record",
    isOfficialHost: true,
  },
  {
    id: "rbi-mpc-resolution",
    sourceId: "RBI",
    sourceUrl: "https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=58912",
    title: "Monetary Policy Statement: Policy Repo Rate Kept Unchanged at 6.50%",
    pubDate: "2026-10-27T08:30:00.000Z",
    body: "On the basis of an assessment of current macroeconomic conditions, the Monetary Policy Committee (MPC) at its meeting today decided to keep the policy repo rate under the liquidity adjustment facility (LAF) unchanged at 6.50 per cent.",
    expectedScope: "india",
    expectedRole: "official_record",
    isOfficialHost: true,
  },
];

export const INTERNATIONAL_CANDIDATE_FIXTURES: CandidateFixture[] = [
  {
    id: "mea-bilateral-maritime",
    sourceId: "MEA",
    sourceUrl: "https://www.mea.gov.in/press-releases.htm?dtl/38901/Maritime_Logistics_Agreement",
    title: "India and France sign Maritime Domain Logistics Support Agreement in Paris",
    pubDate: "2026-10-28T14:00:00.000Z",
    body: "India and France have today concluded and signed a bilateral Maritime Domain Logistics Support Agreement in Paris. The agreement provides reciprocal logistical access to naval facilities in the Indian Ocean and South Pacific.",
    expectedScope: "cross_border",
    expectedRole: "official_record",
    isOfficialHost: true,
  },
  {
    id: "wto-ds-tariff-ruling",
    sourceId: "WTO",
    sourceUrl: "https://www.wto.org/english/news_e/news26_e/dsb_28oct26_e.htm",
    title: "Dispute Settlement Body adopts panel report regarding cross-border steel countervailing duties",
    pubDate: "2026-10-28T12:00:00.000Z",
    body: "The WTO Dispute Settlement Body (DSB) on 28 October 2026 formally adopted the panel report in DS602. The Appellate decision confirms operative limits on unilateral countervailing duties under GATT Article VI.",
    expectedScope: "international",
    expectedRole: "institutional_news",
    isOfficialHost: true,
  },
];

export const UPSC_TRAP_FIXTURES: CandidateFixture[] = [
  {
    id: "mea-trap-non-party-observer",
    sourceId: "MEA",
    sourceUrl: "https://www.mea.gov.in/press-releases.htm?dtl/38905/Global_Plastic_Treaty",
    title: "Official Spokesperson comments on the conclusion of the INC-5 Global Plastic Pollution Treaty negotiations",
    pubDate: "2026-10-28T16:00:00.000Z",
    body: "In response to media queries regarding the conclusion of negotiations on the Global Plastic Pollution Treaty at Busan, the Official Spokesperson stated: India notes the conclusion of the instrument negotiations. India participated in the proceedings as an observer to track national economic implications. India has neither signed nor initiated ratification procedures.",
    expectedScope: "cross_border",
    expectedRole: "official_record",
    isOfficialHost: true,
    isUpscTrap: true,
    trapNote: "UPSC Prelims trap: India attended negotiations as an observer and noted the instrument, but did NOT sign or ratify.",
  },
  {
    id: "spoofed-host-wire-report",
    sourceId: "PIB",
    sourceUrl: "https://not-pib.gov.in/press-release/fake-circular-101",
    title: "Unauthorized domain spoofing official government releases",
    pubDate: "2026-10-28T18:00:00.000Z",
    body: "A rogue domain pretending to be the official press information bureau.",
    expectedScope: "india",
    expectedRole: "official_record",
    isOfficialHost: false,
    isUpscTrap: true,
    trapNote: "Must be rejected by host validation because hostname is not pib.gov.in",
  },
];

