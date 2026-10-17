/**
 * scripts/run-audit-cleanup.ts
 *
 * Direct runner for TASK_083 database audit cleanup:
 * 1. Purges obsolete 2020 COVID trackers masquerading as 2026 news
 * 2. Backdates historical PRS Bills/Acts (2018-2024)
 * 3. Fixes tokenizer typo ('BHAVY A' -> 'BHAVYA')
 * 4. Purges 24-hour ephemeral trivia (VRRR, T-Bills, Special Campaign 6)
 * 5. Re-calibrates last 30-day numerical items from PSY_01 to PSY_05_SCOPE_MUTATE
 */

import "../server-lib/load-env.js";
import { createClient } from "@supabase/supabase-js";
import { isEphemeralTrivia } from "../server-lib/cron/ingest/classify.js";

async function runAuditCleanup() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn("[audit-cleanup] Supabase service role key not available. Skipping direct DB execution.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  console.log("[audit-cleanup] Connecting to Supabase for TASK_083 audit cleanup...");

  try {
    // 1. Remove obsolete 2020 COVID-19 weekly trackers
    const { data: covidItems, error: covidErr } = await supabase
      .from("current_affairs")
      .select("id, headline")
      .or("source.ilike.%PRS%,ministry.ilike.%PRS%")
      .or("headline.ilike.%COVID-19%,headline.ilike.%Apr 13-20, 2020%,headline.ilike.%lockdown%");

    if (!covidErr && covidItems && covidItems.length > 0) {
      const ids = covidItems.map((c) => c.id);
      const { error: delErr } = await supabase.from("current_affairs").delete().in("id", ids);
      console.log(`[audit-cleanup] Purged ${ids.length} obsolete COVID-19 tracker rows:`, delErr || "OK");
    } else {
      console.log("[audit-cleanup] No obsolete COVID-19 tracker rows found.");
    }

    // 2. Backdate historical PRS Bills/Acts (2018-2024)
    const { data: prsItems, error: prsErr } = await supabase
      .from("current_affairs")
      .select("id, headline, published_at")
      .or("source.ilike.%PRS%,ministry.ilike.%PRS%")
      .gte("published_at", "2026-01-01");

    if (!prsErr && prsItems) {
      let backdated = 0;
      for (const item of prsItems) {
        const match = item.headline.match(/\b(2018|2019|2020|2021|2022|2023|2024)\b/);
        if (match) {
          const year = parseInt(match[1], 10);
          const backdatedTime = new Date(Date.UTC(year, 5, 15, 0, 0, 0)).toISOString();
          await supabase
            .from("current_affairs")
            .update({ published_at: backdatedTime })
            .eq("id", item.id);
          backdated++;
        }
      }
      console.log(`[audit-cleanup] Backdated ${backdated} historical PRS rows.`);
    }

    // 3. Fix tokenizer space typo in BHAVYA
    const { data: bhavyaItems } = await supabase
      .from("current_affairs")
      .select("id, headline, summary")
      .or("headline.ilike.%BHAVY A%,summary.cs.{\"bullets\":[\"BHAVY A\"]}");

    if (bhavyaItems && bhavyaItems.length > 0) {
      for (const item of bhavyaItems) {
        const headline = (item.headline || "").replace(/BHAVY A/g, "BHAVYA");
        const summaryStr = JSON.stringify(item.summary || {}).replace(/BHAVY A/g, "BHAVYA");
        await supabase
          .from("current_affairs")
          .update({ headline, summary: JSON.parse(summaryStr) })
          .eq("id", item.id);
      }
      console.log(`[audit-cleanup] Corrected BHAVYA typo in ${bhavyaItems.length} rows.`);
    }

    // 4. Purge existing ephemeral trivia (VRRR, T-Bills, SGS auctions, Switch auctions, SGB redemptions, CPGRAMS)
    const { data: triviaItems } = await supabase
       .from("current_affairs")
       .select("id, headline, summary");

    if (triviaItems) {
      const triviaIds = triviaItems
        .filter((it) =>
          isEphemeralTrivia(it.headline, JSON.stringify(it.summary || {})) ||
          /(Variable Rate Reverse Repo|Treasury Bills.*auction|Workshop on Record Management under Special Campaign|Removal of dust\/silt from roads|Auction of State Government Securities|Conversion\/Switch.*Securities|Premature redemption under Sovereign Gold Bond|CPGRAMS Monthly Report)/i.test(
            it.headline
          )
        )
        .map((it) => it.id);

      if (triviaIds.length > 0) {
        await supabase.from("current_affairs").delete().in("id", triviaIds);
        console.log(`[audit-cleanup] Purged ${triviaIds.length} ephemeral trivia rows.`);
      } else {
        console.log("[audit-cleanup] No ephemeral trivia rows found to purge.");
      }
    }

    // 5. Re-calibrate last 30-day numerical items from PSY_01 to PSY_05
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    const { data: psy1Items } = await supabase
      .from("current_affairs")
      .select("id, headline, summary, primary_operator")
      .eq("primary_operator", "PSY_01_INST_SWAP")
      .gte("created_at", thirtyDaysAgo);

    if (psy1Items && psy1Items.length > 0) {
      let retagged = 0;
      for (const it of psy1Items) {
        const text = `${it.headline} ${JSON.stringify(it.summary || {})}`;
        if (/\b(\d+\s*crore|\d+%\s*|FY\s*\d{2}|\d{4}[-–]\d{2,4}|target|outlay|allocation)\b/i.test(text)) {
          await supabase
            .from("current_affairs")
            .update({ primary_operator: "PSY_05_SCOPE_MUTATE" })
            .eq("id", it.id);
          retagged++;
        }
      }
      console.log(`[audit-cleanup] Re-calibrated ${retagged} rows to PSY_05_SCOPE_MUTATE.`);
    }

    console.log("[audit-cleanup] Audit cleanup completed successfully.");
  } catch (err) {
    console.error("[audit-cleanup] Error during execution:", err);
  }
}

if (process.argv[1]?.includes("run-audit-cleanup")) {
  runAuditCleanup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
