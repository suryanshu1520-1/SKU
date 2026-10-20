import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { TRIGGERS } from "../../../server-lib/policy/instrument-lexicon.ts";
import {
  gateEvent,
  buildProgramSlug,
  parseEventDate,
  type EventFrame,
} from "../../../server-lib/policy/events.ts";
import {
  RING_OF,
  NON_EVENTS,
  type InstrumentClass,
} from "../../../server-lib/policy/instruments.ts";
import { segmentSpans } from "../../../server-lib/cron/ingest/verify.ts";
import {
  EN_GROUNDED_SYSTEM,
  HI_GROUNDED_SYSTEM,
} from "../../../server-lib/cron/ingest/synthesize.ts";

const POSITIVE_ENGLISH_SENTENCES: Record<InstrumentClass, string> = {
  cabinet_approval: "The Union Cabinet chaired by the Prime Minister has approved the scheme.",
  budget_announcement: "The Union Budget announced new tax exemptions for green infrastructure.",
  executive_announcement: "The Government announced a new mission for critical minerals.",
  treaty_signed: "India signed a comprehensive economic partnership agreement with Oman.",
  bill_introduced: "The Government introduced the Digital Personal Data Protection Bill in Parliament.",
  bill_passed: "The Lok Sabha passes the Telecommunications Bill after debate.",
  act_assented: "The President has assented to the landmark infrastructure legislation.",
  ordinance_promulgated: "The President promulgated an ordinance to amend the insolvency code.",
  rules_notified: "The Ministry has notified the new Information Technology Rules, 2026.",
  regulation_issued: "The regulator issued comprehensive regulations for capital adequacy.",
  commencement_or_entry_into_force: "The new safety framework comes into force starting tomorrow.",
  guidelines_issued: "The Department released detailed operational guidelines for semiconductor units.",
  institution_constituted: "The Government has constituted a high-level committee to review taxation.",
  funds_released: "The Ministry released ₹1,500 crore to states under the drinking water mission.",
  tender_awarded: "The national highway authority awarded the construction tender to L&T.",
  interagency_mou: "The two ministries entered into an MoU to coordinate disaster relief.",
  state_rollout: "The health mission was rolled out nationwide across all districts.",
  project_commissioned: "The Prime Minister dedicated to the nation the new offshore gas terminal.",
  beneficiary_milestone: "Over ten lakh farmers benefited from the micro-irrigation initiative.",
  enforcement_action: "The enforcement directorate ordered the attachment of illegal assets in Delhi.",
};

const POSITIVE_HINDI_SENTENCES: Record<InstrumentClass, string> = {
  cabinet_approval: "केंद्रीय मंत्रिमंडल ने राष्ट्रीय जल नीति के संशोधन को मंजूरी दे दी।",
  budget_announcement: "केंद्रीय वित्त मंत्री ने बजट घोषणा में नई विनिर्माण योजनाओं का प्रस्ताव रखा।",
  executive_announcement: "प्रधानमंत्री ने ग्रामीण क्षेत्रों के लिए डिजिटल साक्षरता योजना का शुभारंभ किया।",
  treaty_signed: "भारत और ओमान ने व्यापक आर्थिक साझेदारी समझौते पर हस्ताक्षर किए।",
  bill_introduced: "सदन में डिजिटल व्यक्तिगत डेटा संरक्षण विधेयक पेश किया गया।",
  bill_passed: "संसद के दोनों सदनों ने दूरसंचार विधेयक पारित कर दिया।",
  act_assented: "संसद द्वारा पारित विधेयक को राष्ट्रपति की स्वीकृति मिल गई है।",
  ordinance_promulgated: "राष्ट्रपति ने दिवाला संहिता संशोधन अध्यादेश प्रख्यापित किया।",
  rules_notified: "मंत्रालय ने इस संबंध में नए नियम अधिसूचित किए हैं।",
  regulation_issued: "नियामक प्राधिकरण ने वित्तीय संस्थाओं के लिए नया विनियमन अधिसूचित किया।",
  commencement_or_entry_into_force: "यह नया व्यापार समझौता 20 अक्टूबर से लागू होगा।",
  guidelines_issued: "विभाग ने सेमीकंडक्टर प्रोत्साहन के लिए विस्तृत दिशानिर्देश जारी किए।",
  institution_constituted: "सरकार ने कर सुधारों की समीक्षा के लिए उच्च स्तरीय समिति का गठन किया।",
  funds_released: "मंत्रालय ने ग्रामीण सड़कों के निर्माण के लिए 500 करोड़ रुपये की राशि स्वीकृत की।",
  tender_awarded: "राष्ट्रीय राजमार्ग प्राधिकरण द्वारा राजमार्ग निर्माण का अनुबंध स्वीकृत किया गया।",
  interagency_mou: "दोनों मंत्रालयों ने आपदा प्रबंधन में सहयोग हेतु सहमति पत्र पर हस्ताक्षर किए।",
  state_rollout: "स्वास्थ्य मिशन को सभी राज्यों और जिलों में लागू किया गया।",
  project_commissioned: "प्रधानमंत्री ने नए समुद्री टर्मिनल का लोकार्पण किया।",
  beneficiary_milestone: "प्रधानमंत्री किसान सम्मान निधि से देश के 11 करोड़ किसान लाभान्वित हुए हैं।",
  enforcement_action: "प्रवर्तन निदेशालय ने अवैध संपत्ति के खिलाफ जब्ती की कार्रवाई की।",
};

const NEGATIVE_SENTENCES = [
  "The Minister chaired a comprehensive review meeting with state officials.",
  "The foreign ambassador paid a courtesy call on the Minister today.",
  "The department organized a nationwide Swachhata campaign for public awareness.",
  "A national seminar on public administration was held in New Delhi.",
  "The President presented the national bravery award at a special ceremony.",
  "The delegation undertook a field visit to inspect local school infrastructure.",
  "A grand prize distribution ceremony concluded the annual cultural festival.",
  "Officials attended a two-day international conference on public health.",
  "A mass awareness drive on digital literacy was conducted in rural areas.",
  "A public reception was organized to welcome the visiting cultural troupe.",
];

test("TASK_085I: Instrument Lexicon - Positive and Negative Sentence Detection", () => {
  const classes = Object.keys(TRIGGERS) as InstrumentClass[];
  assert.equal(classes.length, 20, "Must contain all 20 classes");

  // >= 20 English positive sentences match their class
  let enCount = 0;
  for (const c of classes) {
    const text = POSITIVE_ENGLISH_SENTENCES[c];
    assert.ok(text, `Missing English test sentence for ${c}`);
    const triggers = TRIGGERS[c].en;
    const matches = triggers.some((rx) => rx.test(text));
    assert.ok(matches, `English positive sentence failed to match ${c}: "${text}"`);
    enCount++;
  }
  assert.ok(enCount >= 20);

  // >= 20 Hindi positive sentences match their class
  let hiCount = 0;
  for (const c of classes) {
    const text = POSITIVE_HINDI_SENTENCES[c];
    assert.ok(text, `Missing Hindi test sentence for ${c}`);
    const triggers = TRIGGERS[c].hi;
    const matches = triggers.some((rx) => rx.test(text));
    assert.ok(matches, `Hindi positive sentence failed to match ${c}: "${text}"`);
    hiCount++;
  }
  assert.ok(hiCount >= 20);

  // 10 negatives match NO class
  assert.equal(NEGATIVE_SENTENCES.length, 10);
  for (const neg of NEGATIVE_SENTENCES) {
    for (const c of classes) {
      const enMatched = TRIGGERS[c].en.some((rx) => rx.test(neg));
      const hiMatched = TRIGGERS[c].hi.some((rx) => rx.test(neg));
      assert.ok(!enMatched && !hiMatched, `Negative sentence matched class ${c}: "${neg}"`);
    }
  }
});

test("TASK_085I: Gating Pipeline - Deterministic Acceptance Criteria 1-5", () => {
  // Test 1: NZ FTA (Hindi span)
  const hindiBody =
    "वाणिज्य एवं उद्योग मंत्रालय भारत-न्यूजीलैंड मुक्त व्यापार समझौता (एफटीए) 20 अक्टूबर 2026 को विजय दशमी के अवसर पर लागू होगा। यह समझौता दोनों देशों के द्विपक्षीय संबंधों को एक नया आयाम प्रदान करेगा।";
  const spans = segmentSpans(hindiBody);
  assert.ok(spans.length >= 1);

  const frame: EventFrame = {
    instrument: "commencement_or_entry_into_force",
    actor: "वाणिज्य एवं उद्योग मंत्रालय",
    program: "भारत-न्यूजीलैंड मुक्त व्यापार समझौता",
    program_en: "India-New Zealand Free Trade Agreement",
    program_kind: "treaty",
    date_text: null,
    summary:
      "The India-New Zealand free trade agreement comes into force on 20 October 2026.",
    spans: [0],
  };

  const baseCtx = {
    dispatchId: "11111111-1111-1111-1111-111111111111",
    seq: 0,
    sourceUrl: "https://pib.gov.in/PressReleasePage.aspx?PRID=2099999",
    releaseDate: null,
    ingestedAt: "2026-10-21T06:00:00Z",
    resolveActor: (_m: string) => ({
      status: "resolved" as const,
      slug: "MINISTRY_COMMERCE_INDUSTRY",
      score: 1.0,
      via: "exact" as const,
    }),
    resolveProgram: (_m: string) => null,
    extractorVersion: "events_v1",
    nodeId: "NODE_UPSC_ECON_TRADE",
  };

  const outcome1 = gateEvent(frame, spans, baseCtx);
  assert.equal(outcome1.ok, true, "NZ FTA valid frame must pass gate");
  if (outcome1.ok) {
    assert.equal(outcome1.row.ring_depth, 1);
    assert.equal(outcome1.row.date_source, "span");
    assert.equal(outcome1.row.event_date, "2026-10-20");
    assert.equal(outcome1.row.actor_slug, "MINISTRY_COMMERCE_INDUSTRY");
    assert.equal(outcome1.row.program_slug, "PRG_INDIA_NEW_ZEALAND_FREE_TRADE_AGREEMENT");
    assert.ok(outcome1.autoProgram);
    assert.equal(outcome1.autoProgram?.kind, "treaty");
    assert.equal(outcome1.autoProgram?.provenance, "auto");
  }

  // Test 2: Same frame with instrument:'campaign_or_awareness' -> non_event
  const outcome2 = gateEvent(
    { ...frame, instrument: "campaign_or_awareness" },
    spans,
    baseCtx
  );
  assert.equal(outcome2.ok, false);
  if (!outcome2.ok) {
    assert.equal(outcome2.reason, "non_event");
  }

  // Test 3: Frame citing a span without any trigger -> no_trigger
  // Span 1 in hindiBody ("यह समझौता दोनों देशों...") has no trigger
  const outcome3 = gateEvent(
    { ...frame, spans: [1] },
    spans,
    baseCtx
  );
  assert.equal(outcome3.ok, false);
  if (!outcome3.ok) {
    assert.equal(outcome3.reason, "no_trigger");
  }

  // Test 4: Actor "Ministry of Power" absent from the cited span -> actor_not_in_span
  const outcome4 = gateEvent(
    { ...frame, actor: "Ministry of Power" },
    spans,
    baseCtx
  );
  assert.equal(outcome4.ok, false);
  if (!outcome4.ok) {
    assert.equal(outcome4.reason, "actor_not_in_span");
  }

  // Test 5: Summary containing "₹19,744 crore" not present in spans -> numbers_unverified
  const outcome5 = gateEvent(
    {
      ...frame,
      summary:
        "The India-New Zealand free trade agreement with ₹19,744 crore outlay comes into force on 20 October 2026.",
    },
    spans,
    baseCtx
  );
  assert.equal(outcome5.ok, false);
  if (!outcome5.ok) {
    assert.equal(outcome5.reason, "numbers_unverified");
  }
});

test("TASK_085I: Additional Gating and Utility Invariants", () => {
  // buildProgramSlug
  assert.equal(
    buildProgramSlug("India Semiconductor Mission (ISM)"),
    "PRG_INDIA_SEMICONDUCTOR_MISSION_ISM"
  );
  assert.ok(buildProgramSlug("Very Long Program Name That Exceeds Normal Boundaries For Testing Slugs In Databases").length <= 48);

  // parseEventDate
  // Release meta priority
  const dateMeta = parseEventDate("no date in span", "2026-10-25", "2026-10-21T00:00:00Z");
  assert.equal(dateMeta.event_date, "2026-10-25");
  assert.equal(dateMeta.date_source, "release_meta");

  // Span date (English d Month yyyy)
  const dateSpanEn = parseEventDate("Approved on 15 August 2026 by cabinet", null, "2026-10-21T00:00:00Z");
  assert.equal(dateSpanEn.event_date, "2026-08-15");
  assert.equal(dateSpanEn.date_source, "span");

  // Span date (Hindi with nukta फ़रवरी)
  const dateSpanHi = parseEventDate("यह 12 फ़रवरी 2026 को आरंभ हुआ", null, "2026-10-21T00:00:00Z");
  assert.equal(dateSpanHi.event_date, "2026-02-12");
  assert.equal(dateSpanHi.date_source, "span");

  // Ingested fallback
  const dateIngest = parseEventDate("No dates mentioned anywhere", null, "2026-10-18T10:00:00Z");
  assert.equal(dateIngest.event_date, "2026-10-18");
  assert.equal(dateIngest.date_source, "ingested");
});

test("TASK_085I: Prompt Snapshot Test - Grounded vs Ungrounded", () => {
  const nonEventInstruction =
    "Meetings, visits, campaigns, ceremonies, conferences and awareness drives are not policy events.";

  // Both grounded system prompts contain "policy_events" and the non-event instruction
  assert.ok(EN_GROUNDED_SYSTEM.includes('"policy_events"'));
  assert.ok(EN_GROUNDED_SYSTEM.includes(nonEventInstruction));

  assert.ok(HI_GROUNDED_SYSTEM.includes('"policy_events"'));
  assert.ok(HI_GROUNDED_SYSTEM.includes(nonEventInstruction));

  // Verify ungrounded prompts in synthesize.ts DO NOT contain them
  const synthesizeFilePath = path.join(
    process.cwd(),
    "server-lib",
    "cron",
    "ingest",
    "synthesize.ts"
  );
  const synthesizeSrc = fs.readFileSync(synthesizeFilePath, "utf-8");

  // Extract EN_SYSTEM and HI_SYSTEM
  const enSystemMatch = synthesizeSrc.match(/const EN_SYSTEM\s*=\s*\[([\s\S]*?)\]\.join/);
  assert.ok(enSystemMatch);
  assert.ok(!enSystemMatch[1].includes('"policy_events"'));
  assert.ok(!enSystemMatch[1].includes(nonEventInstruction));

  const hiSystemMatch = synthesizeSrc.match(/const HI_SYSTEM\s*=\s*\[([\s\S]*?)\]\.join/);
  assert.ok(hiSystemMatch);
  assert.ok(!hiSystemMatch[1].includes('"policy_events"'));
  assert.ok(!hiSystemMatch[1].includes(nonEventInstruction));

  const enStructuredMatch = synthesizeSrc.match(/const EN_STRUCTURED_SYSTEM\s*=\s*\[([\s\S]*?)\]\.join/);
  assert.ok(enStructuredMatch);
  assert.ok(!enStructuredMatch[1].includes('"policy_events"'));
  assert.ok(!enStructuredMatch[1].includes(nonEventInstruction));

  const hiStructuredMatch = synthesizeSrc.match(/const HI_STRUCTURED_SYSTEM\s*=\s*\[([\s\S]*?)\]\.join/);
  assert.ok(hiStructuredMatch);
  assert.ok(!hiStructuredMatch[1].includes('"policy_events"'));
  assert.ok(!hiStructuredMatch[1].includes(nonEventInstruction));
});
