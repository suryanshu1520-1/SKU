/**
 * scripts/tests/radar/vocab.test.ts
 *
 * Deterministic acceptance tests for Radar panel v2:
 * - sourceHref text fragment encoding (Devanagari, hyphen escaping, hash preservation)
 * - INSTRUMENT_LABEL 20-key exhaustiveness
 * - Vocabulary guard (rendered text never contains forbidden terms)
 * - Honest status rendering (paused, unavailable, ok-empty, stale)
 * - Non-production fixture guard (RADAR_V2_FIXTURE ignored in production)
 * TASK_085Q
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { sourceHref, sourceLabel } from "../../../src/components/observatory/radar-v2/sourceLink.ts";
import { INSTRUMENT_LABEL, RING_LABEL } from "../../../src/components/observatory/radar-v2/labels.ts";
import { RadarV2Panel } from "../../../src/components/observatory/radar-v2/RadarV2Panel.tsx";
import { ProgramLineage } from "../../../src/components/observatory/radar-v2/ProgramLineage.tsx";
import { BossMcq } from "../../../src/components/observatory/radar-v2/BossMcq.tsx";
import { SignalsQuadrant } from "../../../src/components/observatory/radar-v2/SignalsQuadrant.tsx";
import { radarV2Handler } from "../../../server-lib/policy-radar-v2.ts";
import type { RadarV2 } from "../../../src/lib/policy-radar-v2-types.ts";

const FORBIDDEN_VOCAB_REGEX = /ERUPTING|HEATING|volcano|delayed|pending|failed|not done/i;

function mockResponse() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: any = null;

  return {
    setHeader(k: string, v: string) {
      headers[k] = v;
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      jsonBody = body;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get jsonBody() {
      return jsonBody;
    },
    get headers() {
      return headers;
    },
  };
}

test("TASK_085Q: sourceHref text fragment encoding contract", () => {
  // 1. Devanagari first 8 words
  const hindiQuote = "भारत और न्यूज़ीलैंड ने मुक्त व्यापार समझौते पर हस्ताक्षर किए";
  const hindiHref = sourceHref({
    source_url: "https://pib.gov.in/x?PRID=1",
    quote: hindiQuote,
  });
  const expectedHindiFragment = encodeURIComponent(
    "भारत और न्यूज़ीलैंड ने मुक्त व्यापार समझौते पर"
  );
  assert.ok(
    hindiHref.endsWith(`#:~:text=${expectedHindiFragment}`),
    `Devanagari text fragment mismatch: got ${hindiHref}`
  );

  // 2. Hyphen escaping in text directives: India-New Zealand FTA -> India%2DNew%20Zealand%20FTA
  const hyphenQuote = "India-New Zealand FTA";
  const hyphenHref = sourceHref({
    source_url: "https://pib.gov.in/fta",
    quote: hyphenQuote,
  });
  assert.equal(
    hyphenHref,
    "https://pib.gov.in/fta#:~:text=India%2DNew%20Zealand%20FTA"
  );

  // 3. URL containing existing '#' anchor is returned unchanged
  const hashUrl = "https://example.com/doc#existing-anchor";
  const hashHref = sourceHref({
    source_url: hashUrl,
    quote: "Some quote text here",
  });
  assert.equal(hashHref, hashUrl);

  // 4. Hostname without www.
  assert.equal(
    sourceLabel("https://www.pib.gov.in/PressReleasePage.aspx?PRID=1"),
    "pib.gov.in"
  );
  assert.equal(sourceLabel("https://sansad.in/rs/bills"), "sansad.in");
});

test("TASK_085Q: INSTRUMENT_LABEL has exactly 20 enum keys", () => {
  const expectedKeys = [
    "cabinet_approval",
    "budget_announcement",
    "executive_announcement",
    "treaty_signed",
    "bill_introduced",
    "bill_passed",
    "act_assented",
    "ordinance_promulgated",
    "rules_notified",
    "regulation_issued",
    "commencement_or_entry_into_force",
    "guidelines_issued",
    "institution_constituted",
    "funds_released",
    "tender_awarded",
    "interagency_mou",
    "state_rollout",
    "project_commissioned",
    "beneficiary_milestone",
    "enforcement_action",
  ];

  const keys = Object.keys(INSTRUMENT_LABEL);
  assert.equal(keys.length, 20);
  for (const k of expectedKeys) {
    assert.ok(k in INSTRUMENT_LABEL, `Missing instrument label for: ${k}`);
    assert.ok(
      typeof (INSTRUMENT_LABEL as any)[k] === "string" &&
        (INSTRUMENT_LABEL as any)[k].length > 0
    );
  }

  assert.equal(RING_LABEL.length, 4);
});

test("TASK_085Q: Vocabulary guard - rendered text contains no forbidden terms across all components and states", () => {
  const fixturePath = path.resolve(
    process.cwd(),
    "scripts/tests/fixtures/radar/v2-payload.json"
  );
  const fixture: RadarV2 = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

  // 1. Render RadarV2Panel over full fixture
  const panelHtml = renderToStaticMarkup(
    React.createElement(RadarV2Panel, { initialData: fixture })
  );
  assert.equal(
    FORBIDDEN_VOCAB_REGEX.test(panelHtml),
    false,
    `RadarV2Panel rendered forbidden vocabulary: ${panelHtml.match(FORBIDDEN_VOCAB_REGEX)?.[0]}`
  );

  // 2. Render individual programs in ProgramLineage
  for (const prog of fixture.programs) {
    const lineageHtml = renderToStaticMarkup(
      React.createElement(ProgramLineage, { program: prog })
    );
    assert.equal(
      FORBIDDEN_VOCAB_REGEX.test(lineageHtml),
      false,
      `ProgramLineage rendered forbidden vocabulary for ${prog.slug}`
    );

    if (prog.boss_mcq) {
      const mcqHtml = renderToStaticMarkup(
        React.createElement(BossMcq, { mcq: prog.boss_mcq })
      );
      assert.equal(
        FORBIDDEN_VOCAB_REGEX.test(mcqHtml),
        false,
        `BossMcq rendered forbidden vocabulary`
      );
    }
  }

  // 3. Render SignalsQuadrant
  const quadrantHtml = renderToStaticMarkup(
    React.createElement(SignalsQuadrant, { signals: fixture.node_signals })
  );
  assert.equal(
    FORBIDDEN_VOCAB_REGEX.test(quadrantHtml),
    false,
    `SignalsQuadrant rendered forbidden vocabulary`
  );

  // 4. Render honest states: paused, unavailable, ok-empty, stale
  const states: Array<RadarV2["status"]> = ["paused", "unavailable", "ok", "stale"];
  for (const st of states) {
    const statePayload: RadarV2 = {
      ...fixture,
      status: st,
      programs: st === "ok" ? [] : fixture.programs,
    };
    const stateHtml = renderToStaticMarkup(
      React.createElement(RadarV2Panel, { initialData: statePayload })
    );
    assert.equal(
      FORBIDDEN_VOCAB_REGEX.test(stateHtml),
      false,
      `State '${st}' rendered forbidden vocabulary`
    );
  }
});

test("TASK_085Q: Status rendering renders exact fixed copy and correct program visibility", () => {
  const baseCoverage = {
    events: 0,
    programs: 0,
    since: null,
    generated_at: "2025-01-15T00:00:00.000Z",
    last_event_at: null,
  };

  // 1. Paused
  const pausedHtml = renderToStaticMarkup(
    React.createElement(RadarV2Panel, {
      initialData: {
        status: "paused",
        programs: [],
        node_signals: [],
        coverage: baseCoverage,
        version: "v2",
      },
    })
  );
  assert.ok(
    pausedHtml.includes(
      "Policy Radar is being rebuilt on verified sources. It returns when it passes its accuracy checks."
    )
  );
  assert.ok(!pausedHtml.includes("Tracked Programs"));

  // 2. Unavailable
  const unavailHtml = renderToStaticMarkup(
    React.createElement(RadarV2Panel, {
      initialData: {
        status: "unavailable",
        programs: [],
        node_signals: [],
        coverage: baseCoverage,
        version: "v2",
      },
    })
  );
  assert.ok(
    unavailHtml.includes(
      "Policy Radar could not load. Nothing is shown rather than old data."
    )
  );
  assert.ok(!unavailHtml.includes("Tracked Programs"));

  // 3. Empty OK
  const emptyHtml = renderToStaticMarkup(
    React.createElement(RadarV2Panel, {
      initialData: {
        status: "ok",
        programs: [],
        node_signals: [],
        coverage: baseCoverage,
        version: "v2",
      },
    })
  );
  assert.ok(emptyHtml.includes("No verified policy events yet."));
  assert.ok(!emptyHtml.includes("Tracked Programs"));

  // 4. Stale
  const fixturePath = path.resolve(
    process.cwd(),
    "scripts/tests/fixtures/radar/v2-payload.json"
  );
  const fixture: RadarV2 = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
  const staleHtml = renderToStaticMarkup(
    React.createElement(RadarV2Panel, {
      initialData: {
        ...fixture,
        status: "stale",
      },
    })
  );
  assert.ok(staleHtml.includes("Stale since"));
  assert.ok(staleHtml.includes("Tracked Programs"));
});

test("TASK_085Q: RADAR_V2_FIXTURE is ignored when NODE_ENV === 'production'", async () => {
  const origEnv = process.env.NODE_ENV;
  const origFixture = process.env.RADAR_V2_FIXTURE;
  const origPublic = process.env.RADAR_PUBLIC;

  try {
    process.env.NODE_ENV = "production";
    process.env.RADAR_V2_FIXTURE = "scripts/tests/fixtures/radar/v2-payload.json";
    delete process.env.RADAR_PUBLIC; // public gate returns paused

    const res = mockResponse();
    await radarV2Handler({} as any, res as any);

    assert.equal(res.statusCode, 200);
    // In production, fixture is ignored, so gate fires and returns paused
    assert.equal(res.jsonBody.status, "paused");
    assert.deepEqual(res.jsonBody.programs, []);
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origFixture !== undefined) {
      process.env.RADAR_V2_FIXTURE = origFixture;
    } else {
      delete process.env.RADAR_V2_FIXTURE;
    }
    if (origPublic !== undefined) {
      process.env.RADAR_PUBLIC = origPublic;
    } else {
      delete process.env.RADAR_PUBLIC;
    }
  }
});
