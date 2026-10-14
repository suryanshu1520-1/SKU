# TASK_078: Institutional Legal & Compliance Suite Integration (`/privacy`, `/terms`, `/refund`)

**Status:** `ACTIVE`  
**Owner:** `Antigravity`  
**Priority:** `HIGH (Trust, DPDP Act 2023 Compliance & Conversion Gate)`  
**Target Files:**
- `content/legal/privacy-policy.md`
- `content/legal/terms-of-service.md`
- `content/legal/refund-policy.md`
- `src/components/LegalModal.tsx`
- `server-lib/seo/bot-renderer.ts`
- `src/lib/seo.ts`

---

## 1. Objective

Integrate the newly drafted institutional legal charters (`TARK-LEGAL-PP-2026-V2.4`, `TARK-LEGAL-TOS-2026-V2.4`, and `TARK-LEGAL-REF-2026-V2.4`) across both the interactive React client (`src/components/LegalModal.tsx`) and the static SEO/AEO crawler surface (`server-lib/seo/bot-renderer.ts` & `src/lib/seo.ts`).

---

## 2. Implementation Steps for Antigravity

### Step 1: Persist Canonical Markdown Files
Place the three Markdown documents into `content/legal/`:
1. `content/legal/privacy-policy.md`
2. `content/legal/terms-of-service.md`
3. `content/legal/refund-policy.md`

### Step 2: Update `src/components/LegalModal.tsx`
Update the `LegalModal` tabs (`privacy`, `terms`, `refund`) to render the full structured clauses from the three documents, preserving:
- Document ID badges (`TARK-LEGAL-PP-2026-V2.4`, `TARK-LEGAL-TOS-2026-V2.4`, `TARK-LEGAL-REF-2026-V2.4`) in `font-mono` metadata headers.
- The **Lawful Purpose & Retention Matrix** table inside the Privacy Policy tab.
- The **7-Day No-Friction Refund Window** and **500-Seat Cohort Ledger** clauses inside the Refund tab.
- The **Section 52(1)(q) Indian Copyright Act, 1957** provenance declaration and **Single-Aspirant Seat Restriction** inside the Terms tab.

### Step 3: Synchronize SEO / AEO Bot Renderer (`server-lib/seo/bot-renderer.ts` & `src/lib/seo.ts`)
Ensure that when search crawlers (Googlebot, Bingbot) or AI answer engines (`PerplexityBot`, `OAI-SearchBot`, `ClaudeBot`) request `/privacy`, `/terms`, or `/refund`:
1. `server-lib/seo/bot-renderer.ts` serves the full semantic HTML rendering of these documents with proper `<h1>`, `<h2>`, and `<table>` tags.
2. `src/lib/seo.ts` emits accurate `<title>`, `<meta name="description">`, and canonical URLs (`https://tark.live/privacy`, `https://tark.live/terms`, `https://tark.live/refund`).

---

## 3. Acceptance Criteria & Verification

- [ ] `npm run build` and `tsc --noEmit` pass with zero TypeScript errors.
- [ ] Opening `/privacy`, `/terms`, and `/refund` in the client modal displays the updated October 14, 2026 `V2.4` charters with readable typography and scannable tables.
- [ ] Curling `/privacy`, `/terms`, and `/refund` with a bot User-Agent (`Googlebot` / `ClaudeBot`) returns complete server-rendered HTML matching the Markdown source.