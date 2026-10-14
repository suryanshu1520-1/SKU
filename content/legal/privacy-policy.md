---
title: "Privacy Policy & Data Governance Charter"
slug: "/privacy"
document_id: "TARK-LEGAL-PP-2026-V2.4"
effective_date: "2026-10-14"
last_updated: "2026-10-14"
jurisdiction: "Republic of India"
statutes:
  - "Digital Personal Data Protection Act, 2023 (No. 22 of 2023)"
  - "Information Technology Act, 2000 (Section 43A)"
  - "IT (Reasonable Security Practices and Procedures and SPDI) Rules, 2011"
---

# Privacy Policy & Data Governance Charter

**EFFECTIVE DATE:** October 14, 2026  
**LAST UPDATED:** October 14, 2026  
**DOCUMENT ID:** `TARK-LEGAL-PP-2026-V2.4`

---

## 1. Preamble & Statutory Framework

**1.1. Scope of Instrument.** This Privacy Policy and Data Governance Charter (**"Policy"**) governs the collection, processing, cryptographic storage, telemetry aggregation, and erasure of Personal Data and Usage Telemetry by **Tark** (**"Platform," "Company," "Data Fiduciary," "we," "us,"** or **"our"**), operating at `https://www.tark.live` and `https://tark.live` (including all associated sub-domains, APIs, and command interfaces).

**1.2. Statutory Alignment.** This Policy is drafted and enforced in strict compliance with:
* **(a)** The **Digital Personal Data Protection Act, 2023 (No. 22 of 2023)** (**"DPDP Act"**), under which Tark acts as a *Data Fiduciary* and you act as a *Data Principal*;
* **(b)** Section 43A of the **Information Technology Act, 2000**, read with the **Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011** (**"SPDI Rules"**); and
* **(c)** The **Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021**.

**1.3. The Tark Sovereign Data Covenant.** As a foundational operating invariant of the Platform, Tark operates under an absolute **Zero-Ad, Zero-Affiliate, and Zero-Brokerage Mandate**:
* **(i)** We do not serve third-party advertisements, behavioural retargeting pixels, affiliate links, or sponsored commercial content.
* **(ii)** We never sell, rent, license, syndicate, or trade your Personal Data, test performance records, or psychometric telemetry to coaching institutes, marketing agencies, data brokers, or third parties.

---

## 2. Definitions

* **2.1. "Diagnostic Telemetry"** means granular examination interaction data generated when a user engages with the Test Arena, Exam Hall, Live Diagnostic, or Daily Brief drills, including option lock timestamps, response latency (`SRV_EVAL`), $+2.00 / -0.66$ scoring outcomes, `50:50 Ledger` elimination tags, subject accuracy matrices (`POL`, `ECO`, `HIS`, `GEO`, `ENV`, `SCI`), and assigned vulnerability identifiers (e.g., `CONST_SCHED_01`).
* **2.2. "Data Principal"** means the natural person (aspirant, visitor, or lifetime seat holder) to whom the Personal Data relates.
* **2.3. "Personal Data"** means any data about an individual who is identifiable by or in relation to such data, as defined under Section 2(t) of the DPDP Act, 2023.
* **2.4. "Unauthenticated Session"** means interaction with the public landing surface of `tark.live`—specifically the 5-question above-the-fold Live Diagnostic—without registering or authenticating an account.

---

## 3. Categories of Data Collected & Lawful Purpose Matrix

We adhere strictly to the principle of **Data Minimization**. We collect only the minimum data necessary to execute server-side grading, maintain your longitudinal performance record, and verify lifetime seat ownership.

| Data Category | Specific Data Elements | Lawful Basis & Purpose of Processing | Retention Period |
| :--- | :--- | :--- | :--- |
| **A. Unauthenticated Diagnostic Data** | Ephemeral option selections (`a`, `b`, `c`, `d`), timer state, and server evaluation payload on the landing page diagnostic. | **Legitimate Use / User-Initiated Action:** Executing immediate $+2.00 / -0.66$ answer verification without requiring account registration. | Ephemeral; purged upon browser session termination unless bound to a registered account. |
| **B. Identity & Authentication Data** | Email address, display name/handle (for Leaderboard), OAuth provider tokens, and cryptographic session JWTs. | **Explicit Consent (Sec. 6, DPDP Act):** Account provisioning, cross-device state synchronization, and seat binding. | Active account duration $+ 30$ days post-deletion request. |
| **C. Psychometric & Diagnostic Telemetry** | Question attempt history, $+2.00 / -0.66$ score logs, `50:50 Ledger` risk-calibration ratios, subject accuracy percentages, vulnerability tags, candidate dossier preferences, and bookmarked briefs. | **Contractual Performance:** Powering the 4-stage telemetry loop ($\text{Practice} \rightarrow \text{Diagnose} \rightarrow \text{Review} \rightarrow \text{Improve}$), generating corrective drills, and computing Leaderboard standings. | Retained for the lifetime of the account to preserve longitudinal study history; erasable on demand. |
| **D. Financial & Seat Allocation Metadata** | Razorpay `order_id`, `payment_id`, cryptographic verification signature, timestamp, and Lifetime Seat allocation index ($1\text{–}500$). | **Statutory Obligation & Contract:** Verifying the one-time ₹399 settlement and maintaining statutory tax/audit records under Indian law. | $8$ years (as mandated under the Income Tax Act, 1961 and GST statutes). |
| **E. System & Security Logs** | IP address (anonymized/truncated), TLS handshake metadata, User-Agent string, and rate-limit counters. | **Legitimate Interest / Security:** Preventing automated scraping of the $2000\text{–}2025$ PYQ vault, DDoS mitigation, and enforcing server-side grading integrity. | Rolling $90$-day window. |

**3.1. Strict Exclusion of Payment Instrument Storage.** All financial transactions are processed exclusively through **Razorpay Software Private Limited** (a PCI-DSS Level 1 certified payment aggregator regulated by the Reserve Bank of India). Tark **never** collects, views, processes, or stores your raw credit/debit card numbers, CVV, net-banking credentials, or UPI PINs on its servers.

---

## 4. Server-Side Telemetry & Leaderboard Pseudonymity

**4.1. Authoritative Server Evaluation.** When you submit an answer bubble in the Test Arena, Exam Hall, or Live Diagnostic, your selection is transmitted via encrypted TLS 1.3 transport to our evaluation server (`BAY_01 // INGESTION` through `BAY_04 // RESOLUTION`). This data is processed solely to compute your score, identify statutory clause mismatches, and prescribe targeted practice sets.

**4.2. Cohort Benchmarking & Leaderboard Privacy.** The Tark Leaderboard (`Alt + 7`) ranks aspirants based on verified test accuracy and cumulative marks. By default, Leaderboard entries display only your chosen pseudonymous handle or initials alongside your performance metrics. Your email address and private contact details are never exposed to other users on the Leaderboard.

---

## 5. Sub-Processors & Infrastructure Architecture

To deliver sub-$50\text{ms}$ evaluation latency and high availability, Tark engages a restricted set of enterprise infrastructure sub-processors bound by strict Data Processing Agreements (DPAs):

1. **Database & Authentication Substrate (Supabase, Inc.):** Hosts encrypted PostgreSQL relational tables (storing user profiles, question attempt ledgers, and syllabus progress) with Row-Level Security (RLS) enforced at the database kernel level.
2. **Edge Compute & Delivery (Vercel Inc.):** Provides global TLS termination, edge routing, and serverless execution for grading endpoints.
3. **Payment Gateway (Razorpay Software Pvt. Ltd.):** Executes ₹399 checkout settlement, webhook signature verification, and refund disbursement.

---

## 6. Cookies, Local Storage & Zero-Tracking Architecture

**6.1. Strictly Necessary Storage Only.** Tark uses browser `localStorage` and first-party `HttpOnly`, `Secure`, `SameSite=Lax` cookies exclusively for:
* **(a)** Maintaining your authenticated session token;
* **(b)** Preserving in-progress timed test state (`Answered`, `For review`, `Not visited`) and OMR sheet buffers against accidental browser refresh or network drop; and
* **(c)** Storing UI layout preferences (such as Command Rail collapse state via `Alt + [` and candidate onboarding preferences).

**6.2. Absence of Surveillance Pixels.** Tark does not embed Meta Pixels, Google AdSense scripts, third-party cross-site tracking cookies, or canvas fingerprinting scripts.

---

## 7. Rights of the Data Principal (Under the DPDP Act, 2023)

Pursuant to Sections 11 through 14 of the Digital Personal Data Protection Act, 2023, you hold the following enforceable rights:

* **7.1. Right to Access Information (Section 11):** You may request a complete summary of your Personal Data, telemetry logs, and processing activities in a machine-readable JSON or CSV format.
* **7.2. Right to Correction and Erasure (Section 12):** You may update inaccurate account details or trigger a **Full Account & Telemetry Purge**, which permanently deletes your Personal Data and anonymizes your historical test records within **72 hours** (save for financial invoice metadata required to be retained by tax law).
* **7.3. Right to Withdrawal of Consent (Section 6(4))):** You may withdraw consent for data processing at any time, with the understanding that withdrawal of consent necessary for account authentication will result in account termination.
* **7.4. Right of Grievance Redressal (Section 13):** You have the right to register a formal grievance with our designated Grievance Officer and, if unresolved, escalate to the Data Protection Board of India.
* **7.5. Right to Nominate (Section 14):** You may nominate another individual to exercise your rights as a Data Principal in the event of death or incapacity.

---

## 8. Information Security & Breach Notification

**8.1. Technical Safeguards.** All data in transit is encrypted via **TLS 1.3** (`HTTPS`), and all data at rest is encrypted using **AES-256**. Official answer keys and user telemetry are isolated behind server-side API boundaries and PostgreSQL Row-Level Security (RLS) policies, ensuring no client browser can inspect unrevealed answer keys or query another user's private performance records.

**8.2. Statutory Breach Protocol.** In the unlikely event of a Personal Data breach, Tark shall notify the **Indian Computer Emergency Response Team (CERT-In)** within the mandated statutory window, as well as the **Data Protection Board of India** and affected Data Principals in accordance with Section 8(6) of the DPDP Act, 2023.

---

## 9. Grievance Officer & Contact Information

In accordance with Rule 5(9) of the IT (SPDI) Rules, 2011 and Section 13 of the DPDP Act, 2023, any requests regarding data access, erasure, or privacy grievances may be directed to:

* **Designation:** Data Protection & Grievance Officer — Tark
* **Platform:** `https://www.tark.live`
* **Electronic Dispatch:** `support@tark.live`
* **Acknowledgement SLA:** Within **24 hours** of receipt.
* **Resolution SLA:** Within **7 business days** (well inside the statutory 15-day mandate under Indian law).
