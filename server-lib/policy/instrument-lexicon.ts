/**
 * server-lib/policy/instrument-lexicon.ts
 *
 * Deterministic trigger patterns in English and Hindi for all 20 policy instrument classes.
 * An extracted event must match at least one trigger pattern in its cited spans to pass gating.
 */

import type { InstrumentClass } from "./instruments.ts";

export interface LexiconTrigger {
  en: RegExp[];
  hi: RegExp[];
}

export const TRIGGERS: Record<InstrumentClass, LexiconTrigger> = {
  // Ring 0: Political / Mandate decisions
  cabinet_approval: {
    en: [/\b(union )?cabinet\b.*\bapprov/i, /\bCCEA\b/],
    hi: [/मंत्रिमंडल/, /मंजूरी/],
  },
  budget_announcement: {
    en: [/\bbudget\b.*\b(announc|allocat|propos)/i, /\bunion budget\b/i],
    hi: [/बजट.*घोषणा/, /बजट.*आवंटन/],
  },
  executive_announcement: {
    en: [/\b(announced|unveiled|launched)\b.*\b(scheme|initiative|programme|mission|portal|yojana)\b/i],
    hi: [/(शुरू|शुरुआत|घोषणा).*योजना/, /शुभारंभ/],
  },
  treaty_signed: {
    en: [/\bsign(ed|ing)\b.*\b(agreement|MoU|treaty|FTA|pact)\b/i, /\bconcluded.*\btreaty\b/i],
    hi: [/हस्ताक्षर/, /समझौता.*हस्ताक्षरित/],
  },

  // Ring 1: Legal Instruments
  bill_introduced: {
    en: [/\bintroduced\b.*\bbill\b/i, /\bbill\b.*\bintroduced\b/i, /\btabled\b.*\bbill\b/i],
    hi: [/विधेयक.*पेश/, /विधेयक.*प्रस्तुत/],
  },
  bill_passed: {
    en: [/\bbill\b.*\bpassed\b/i, /\bpasses\b.*\bbill\b/i, /\bparliament passes\b/i],
    hi: [/विधेयक.*पारित/, /संसद.*पारित/],
  },
  act_assented: {
    en: [
      /\bassent(ed)?\b.*\b(president|governor)\b/i,
      /\b(president|governor)\b.*\bassent(ed)?\b/i,
      /\bnotified as an act\b/i,
    ],
    hi: [/राष्ट्रपति.*स्वीकृति/, /अधिनियम.*अधिसूचित/],
  },
  ordinance_promulgated: {
    en: [/\bordinance\b.*\bpromulgat/i, /\bpromulgat\w*\b.*\bordinance\b/i],
    hi: [/अध्यादेश.*प्रख्यापित/, /अध्यादेश.*जारी/],
  },
  rules_notified: {
    en: [/\bnotif(y|ied|ication)\b/i, /\bRules,? 20\d\d\b/],
    hi: [/अधिसूच/, /नियम.*अधिसूचित/],
  },
  regulation_issued: {
    en: [
      /\bregulations?\b.*\b(issued|notified|amended|framed)\b/i,
      /\b(issued|notified|amended|framed)\b.*\bregulations?\b/i,
      /\bregulatory framework\b/i,
    ],
    hi: [/विनियम.*जारी/, /विनियमन.*अधिसूचित/],
  },
  commencement_or_entry_into_force: {
    en: [/\b(come|comes|came) into (force|effect)\b/i, /\btake[s]? effect\b/i, /\beffective from\b/i],
    hi: [/लागू\s*हो/, /प्रभावी\s*हो/],
  },

  // Ring 2: Execution & Administrative Machinery
  guidelines_issued: {
    en: [/\bguidelines?\b/i, /\bSOPs?\b/i, /\bissued operational guidelines\b/i],
    hi: [/दिशानिर्देश/, /दिशा-निर्देश/, /मानक संचालन प्रक्रिया/],
  },
  institution_constituted: {
    en: [/\b(constitut|constituted|set up|established)\b.*\b(committee|panel|commission|board|authority|council|task force)\b/i],
    hi: [/(समिति|आयोग|बोर्ड|प्राधिकरण|टास्क फोर्स).*गठन/, /स्थापना/],
  },
  funds_released: {
    en: [/\b(released|sanctioned|allocated|disbursed)\b.*(₹|rs\.?|crore|lakh)/i],
    hi: [/(जारी|स्वीकृत|आवंटित|संवितरित)/],
  },
  tender_awarded: {
    en: [
      /\b(tender|contract|bid)\b.*\b(awarded|floated|invited)\b/i,
      /\b(awarded|floated|invited)\b.*\b(tender|contract|bid)\b/i,
    ],
    hi: [
      /(निविदा|अनुबंध|ठेका).*स्वीकृत/,
      /निविदा.*आमंत्रित/,
      /(स्वीकृत|आमंत्रित).*(निविदा|अनुबंध|ठेका)/,
    ],
  },
  interagency_mou: {
    en: [
      /\bMoU\b.*\b(signed|inked|entered)\b/i,
      /\b(signed|inked|entered)\b.*\bMoU\b/i,
      /\bmemorandum of understanding\b/i,
    ],
    hi: [/एमओयू.*हस्ताक्षर/, /सहमति पत्र.*हस्ताक्षर/],
  },

  // Ring 3: Delivery & On-The-Ground Rollout
  state_rollout: {
    en: [/\b(roll(ed)? out|implemented|expanded)\b.*\b(states?|districts?|nationwide|pan-india)\b/i],
    hi: [/(राज्यों|जिलों|देशभर).*लागू/, /राष्ट्रव्यापी विस्तार/],
  },
  project_commissioned: {
    en: [/\b(inaugurat|dedicat\w* to the nation|commission(ed)?)\b/i, /\bcommercial operation\b/i],
    hi: [/(उद्घाटन|लोकार्पण)/, /राष्ट्र को समर्पित/, /चालू किया/],
  },
  beneficiary_milestone: {
    en: [/\b(beneficiar|households?|farmers?|citizens?|students?)\b.*\b(cross(ed)?|reach(ed)?|benefit(t)?ed)\b/i],
    hi: [/(लाभार्थियों|किसानों|परिवारों).*संख्या/, /लाभान्वित/],
  },
  enforcement_action: {
    en: [/\b(seiz|arrest|penalt|raid|crackdown|attachment)\b/i],
    hi: [/(जब्त|गिरफ्तार|जुर्माना|छापेमारी|कुर्की)/],
  },
};
