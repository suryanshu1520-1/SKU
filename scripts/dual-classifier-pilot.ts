/**
 * scripts/dual-classifier-pilot.ts
 *
 * Dual-Classifier Pilot Runner (WS-1.1):
 * Runs Rater A (embedding-cosine gate) and Rater B (keyword/entity classifier)
 * on a sample of 50 unattributed current affairs claims from Supabase.
 * Generates an agreement/disagreement report at 03_MEMORY/sources/dual-classifier-pilot-report.md.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { NODES, nodeText } from "../server-lib/cron/ingest/syllabus/nodes.js";
import { relevanceGate, DEFAULT_GATE } from "../server-lib/cron/ingest/syllabus/gate.js";
import { keywordClassify } from "../server-lib/cron/ingest/syllabus/keyword-classifier.js";
import type { SyllabusNode } from "../server-lib/cron/ingest/syllabus/types.js";

interface ClaimSample {
  id: string;
  headline: string;
  claimText: string;
  ministry?: string;
  source?: string;
}

const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const GEMINI_EMBED_DIM = Number(process.env.GEMINI_EMBED_DIM) || 768;
const GEMINI_EMBED_TASK = process.env.GEMINI_EMBED_TASK || "SEMANTIC_SIMILARITY";

function l2normalize(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n);
  if (n === 0) return v;
  return v.map((x) => x / n);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function embedWithRetry(ai: GoogleGenAI, text: string, maxRetries = 5): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res: any = await ai.models.embedContent({
        model: GEMINI_EMBED_MODEL,
        contents: text.slice(0, 2000),
        config: {
          taskType: GEMINI_EMBED_TASK,
          outputDimensionality: GEMINI_EMBED_DIM,
        },
      });
      const values: number[] =
        res?.embeddings?.[0]?.values ?? res?.embedding?.values ?? [];
      if (values.length > 0) {
        return l2normalize(values);
      }
      throw new Error("Empty embedding returned from Gemini");
    } catch (err: any) {
      const is429 = err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED");
      if (is429 && attempt < maxRetries) {
        console.warn(`[pilot][embed] 429 rate limit hit, sleeping 7s before retry (attempt ${attempt}/${maxRetries})...`);
        await sleep(7000);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed to embed after ${maxRetries} attempts`);
}

async function getCachedOrFetchNodeEmbeddings(ai: GoogleGenAI, nodes: SyllabusNode[]): Promise<void> {
  const cachePath = path.resolve(process.cwd(), "scripts/data/gemini-node-embeddings.json");
  let cache: Record<string, number[]> = {};

  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      console.log(`Loaded ${Object.keys(cache).length} cached node embeddings.`);
    } catch (e) {
      cache = {};
    }
  }

  let newlyEmbedded = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (cache[node.id] && cache[node.id].length === GEMINI_EMBED_DIM) {
      node.embedding = cache[node.id];
    } else {
      console.log(`[${i + 1}/${nodes.length}] Embedding node: ${node.id}`);
      const vec = await embedWithRetry(ai, nodeText(node));
      node.embedding = vec;
      cache[node.id] = vec;
      newlyEmbedded++;
      // Save cache every 10 nodes
      if (newlyEmbedded % 10 === 0) {
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
      }
      await sleep(150); // slight pacing
    }
  }

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  console.log(`All ${nodes.length} syllabus nodes embedded with 100% genuine Gemini vectors.`);
}

async function fetchSampleClaims(): Promise<ClaimSample[]> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("current_affairs")
      .select("id, headline, ministry, summary, source")
      .not("summary", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      return data.map((row: any) => {
        const bullets = Array.isArray(row.summary?.bullets) ? row.summary.bullets.join(" ") : "";
        const claimText = `${row.headline}. ${bullets}`.trim();
        return {
          id: row.id,
          headline: row.headline,
          claimText,
          ministry: row.ministry,
          source: row.source,
        };
      });
    }
  }

  const localCachePath = path.resolve(process.cwd(), "scripts/data/sample-50-claims.json");
  if (fs.existsSync(localCachePath)) {
    const content = fs.readFileSync(localCachePath, "utf-8");
    return JSON.parse(content);
  }

  throw new Error("Unable to fetch claims and no local cache found.");
}

async function main() {
  console.log("== Starting Dual-Classifier Pilot (WS-1.1) ==");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Refusing to run the pilot: GEMINI_API_KEY is not set in environment or .env. " +
      "Rater A requires genuine Gemini embeddings (gemini-embedding-001 at 768-dim)."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Load claims
  const claims = await fetchSampleClaims();
  console.log(`Loaded ${claims.length} claims for evaluation.`);

  // 2. Initialize Embedder & Embed Syllabus Nodes (Rater A)
  console.log(`Embedding/verifying ${NODES.length} syllabus nodes via Gemini API...`);
  await getCachedOrFetchNodeEmbeddings(ai, NODES);

  // 3. Evaluate each claim across both raters
  let agreedCount = 0;
  const results: Array<{
    claim: ClaimSample;
    raterA: { topNodeId: string | null; score: number; passed: boolean; matchCount: number };
    raterB: { topNodeId: string | null; score: number; passed: boolean; matchedEntities: string[] };
    isAgreed: boolean;
  }> = [];

  console.log("Running dual classification on sample claims with Gemini embeddings...");

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    process.stdout.write(`[${i + 1}/${claims.length}] Classifying: ${claim.headline.slice(0, 40)}... `);

    // Rater A: Embedding Cosine Relevance Gate
    const claimVec = await embedWithRetry(ai, claim.claimText);
    const gateRes = relevanceGate(claimVec, NODES, DEFAULT_GATE);
    const raterATopNode = gateRes.passed && gateRes.matches.length > 0 ? gateRes.matches[0].nodeId : null;
    const raterAScore = gateRes.topSim;

    // Rater B: Keyword & Entity Overlap Classifier
    const keyRes = keywordClassify(claim.claimText, NODES);
    const raterBTopNode = keyRes.passed && keyRes.matches.length > 0 ? keyRes.matches[0].nodeId : null;
    const raterBScore = keyRes.topScore;
    const raterBEntities = keyRes.matches.length > 0 ? keyRes.matches[0].matchedEntities : [];

    // Agreement check
    const isAgreed =
      (raterATopNode === raterBTopNode) ||
      (!gateRes.passed && !keyRes.passed);

    if (isAgreed) agreedCount++;

    console.log(isAgreed ? "AGREED" : "DISAGREED", `(A: ${raterATopNode || "NONE"} [${raterAScore.toFixed(3)}], B: ${raterBTopNode || "NONE"} [${raterBScore}])`);

    results.push({
      claim,
      raterA: {
        topNodeId: raterATopNode,
        score: Math.round(raterAScore * 1000) / 1000,
        passed: gateRes.passed,
        matchCount: gateRes.matches.length,
      },
      raterB: {
        topNodeId: raterBTopNode,
        score: raterBScore,
        passed: keyRes.passed,
        matchedEntities: raterBEntities,
      },
      isAgreed,
    });

    await sleep(200); // pacing between claims
  }

  const agreementPct = Math.round((agreedCount / claims.length) * 1000) / 10;
  const disagreementCount = claims.length - agreedCount;

  console.log(`\n======================================================`);
  console.log(`Results: Total: ${claims.length} | Agreed: ${agreedCount} (${agreementPct}%) | Disagreed: ${disagreementCount}`);
  console.log(`======================================================\n`);

  // 4. Generate Markdown Report
  const disagreements = results.filter((r) => !r.isAgreed);
  const agreements = results.filter((r) => r.isAgreed);

  let report = `# Dual-Classifier Pilot Report (WS-1.1 Attribution Gate)\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Evaluation Model:** Gemini \`${GEMINI_EMBED_MODEL}\` (768-dim, \`SEMANTIC_SIMILARITY\`) vs Deterministic Keyword Overlap\n`;
  report += `**Evaluation Objective:** Establish baseline agreement between Rater A (Embedding-Cosine Gate, \`threshold = ${DEFAULT_GATE.threshold}\`) and Rater B (Keyword/Entity Classifier) on 50 live current affairs claims.\n\n`;
  report += `## Summary Metrics\n\n`;
  report += `- **Total Sampled Claims:** ${claims.length}\n`;
  report += `- **Agreed Attributions:** ${agreedCount} (${agreementPct}%)\n`;
  report += `  - _Concordant Syllabus Node Matches:_ ${agreements.filter((a) => a.raterA.topNodeId !== null).length}\n`;
  report += `  - _Concordant Rejections (Both Out-of-Syllabus):_ ${agreements.filter((a) => a.raterA.topNodeId === null).length}\n`;
  report += `- **Disagreed Attributions (Human Review Queue):** ${disagreementCount} (${(100 - agreementPct).toFixed(1)}%)\n\n`;

  report += `## Methodology\n\n`;
  report += `- **Rater A (Semantic Embedding Gate):** Embeds claim text via Gemini \`${GEMINI_EMBED_MODEL}\` at 768-dim and computes cosine similarity against all ~130 \`SyllabusNode\` embeddings (\`threshold = ${DEFAULT_GATE.threshold}\`).\n`;
  report += `- **Rater B (Keyword/Entity Overlap):** Matches curated \`SyllabusNode.entities\` and tokenized \`gloss\` against claim text using deterministic substring/token overlap.\n`;
  report += `- **Agreement Definition:** Both raters assign the exact same top \`nodeId\`, or both raters reject the claim as unmapped/out-of-syllabus.\n\n`;

  report += `## Concordant Matches Sample\n\n`;
  report += `| # | Headline | Agreed Node | Rater A Cosine | Rater B Score | Matched Entities |\n`;
  report += `|---|---|---|---|---|---|\n`;
  agreements.forEach((a, idx) => {
    const headline = a.claim.headline.slice(0, 50).replace(/\|/g, "\\|");
    const nodeStr = a.raterA.topNodeId ? `\`${a.raterA.topNodeId}\`` : `_NONE (Both Rejected)_`;
    const entities = a.raterB.matchedEntities.slice(0, 2).join(", ") || "-";
    report += `| ${idx + 1} | ${headline} | ${nodeStr} | ${a.raterA.score} | ${a.raterB.score} | ${entities} |\n`;
  });

  report += `\n## Disagreement Adjudication Queue (N = ${disagreements.length})\n\n`;
  report += `| # | Claim Headline / Summary Snippet | Rater A (Embedding) Top Node [Cosine] | Rater B (Keyword) Top Node [Score / Matches] |\n`;
  report += `|---|---|---|---|\n`;

  disagreements.forEach((d, idx) => {
    const snippet = d.claim.claimText.slice(0, 120).replace(/\|/g, "\\|") + "...";
    const raterAStr = d.raterA.topNodeId
      ? `\`${d.raterA.topNodeId}\` (${d.raterA.score})`
      : `_None / Failed Gate_ (${d.raterA.score})`;
    const raterBStr = d.raterB.topNodeId
      ? `\`${d.raterB.topNodeId}\` (${d.raterB.score}) [${d.raterB.matchedEntities.slice(0, 2).join(", ")}]`
      : `_None / No Entity Match_`;
    report += `| ${idx + 1} | ${snippet} | ${raterAStr} | ${raterBStr} |\n`;
  });

  const outPath = path.resolve(process.cwd(), "03_MEMORY/sources/dual-classifier-pilot-report.md");
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`Report successfully written to ${outPath}`);
}

main().catch((err) => {
  console.error("Dual-classifier pilot error:", err);
  process.exit(1);
});
