import json
import re
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
COMPENDIUM_PATH = ROOT_DIR / "docs" / "PIB_COMPENDIUM_MASTER_CHRONICLE_2026.md"
RIPPLE_PATH = ROOT_DIR / "scripts" / "data" / "simulations" / "ripple_effects_manifest.json"
TIER_PATH = ROOT_DIR / "scripts" / "data" / "simulations" / "entity_disambiguation_grid.json"

def main():
    print("Reading compendium and ripple datasets...")
    with open(COMPENDIUM_PATH, "r", encoding="utf-8") as f:
        compendium = f.read()

    with open(RIPPLE_PATH, "r", encoding="utf-8") as f:
        ripple_data = json.load(f)

    with open(TIER_PATH, "r", encoding="utf-8") as f:
        tier_data = json.load(f)

    chains = ripple_data.get("chains", [])

    # Check if section 11 already exists to avoid duplicates
    if "## SECTION 11: THE MACRO POLICY RIPPLE & SYSTEMIC WEB INDEX" in compendium:
        print("Section 11 already exists. Removing old version before re-inserting...")
        compendium = compendium.split("## SECTION 11: THE MACRO POLICY RIPPLE & SYSTEMIC WEB INDEX")[0]
        # remove any trailing '### END OF COMPENDIUM' markers from first half
        compendium = re.sub(r'---\s*\n\s*### END OF COMPENDIUM.*$', '', compendium, flags=re.DOTALL)

    # 1. Update the table of contents if not present
    toc_target = "10. **[THE MASTER STATUTORY, SCHEMES & DATA METRICS LEDGER](#section-10-the-master-statutory-schemes--data-metrics-ledger)**: Comprehensive Master Index of all Schemes, Statutory Acts, Ministries & Fiscal Targets"
    new_toc = toc_target + "\n11. **[THE MACRO POLICY RIPPLE & SYSTEMIC WEB INDEX](#section-11-the-macro-policy-ripple-web-index)**: 15 Inter-Ministerial Policy Ripple Chains, 5-Tier Legal Entity Classification & Obsidian Visual Knowledge Canvas"

    if "11. **[THE MACRO POLICY RIPPLE" not in compendium:
        compendium = compendium.replace(toc_target, new_toc)

    # 2. Update Front Page Lead callout if not present
    lead_callout = """
> [!NOTE]
> ### 🌐 THE MACRO POLICY RIPPLE GRAPH & ENTITY KNOWLEDGE WEB (2026)
> In-depth analytical decomposition of the 499 PIB digests reveals that governance in 2026 operates as a deeply interconnected web rather than siloed ministerial announcements. 
> - **15 Canonical Ripple Chains**: Tracking how a single executive impulse (e.g. Semicon 2.0 or Critical Minerals auction) cascades across Power, Steel, MeitY, Commerce, and the RBI.
> - **5-Tier Legal Entity Architecture**: Disambiguating 370 governing bodies into *Tier 1 (Constitutional)*, *Tier 2 (Statutory)*, *Tier 3 (Executive Divisions)*, *Tier 4 (Industry/Societies)*, and *Tier 5 (PSUs)* to definitively neutralize examiner trick-questions (`PSY_01_INST_SWAP` & `PSY_03_LEGAL_TIER`).
> - **Obsidian Visual Canvas**: Available in the Tark Knowledge Vault at [`01_VAULT/PIB_Policy_Ripple_Web_2026.canvas`](file:///01_VAULT/PIB_Policy_Ripple_Web_2026.canvas).
> - **Interactive In-App Simulator**: Access the live, filterable **Policy Ripple Radar** in the Tark Observatory UI (`Observatory -> Policy Ripple Radar`).
"""

    if "THE MACRO POLICY RIPPLE GRAPH & ENTITY KNOWLEDGE WEB" not in compendium:
        target_lead = "> Across 499 official communiqués analyzed herein, the paper-setters' true operational blueprint emerges: policy is no longer articulated through isolated spending announcements, but through binding **Statutory Anchors**, inter-ministerial **PM GatiShakti Network Planning Group (NPG)** clearances, and rigorous **PLI / SIGHT component disbursement metrics**."
        compendium = compendium.replace(target_lead, target_lead + "\n" + lead_callout)

    # 3. Build Section 11 Markdown
    sec11_lines = []
    sec11_lines.append("\n---\n")
    sec11_lines.append('<a id="section-11-the-macro-policy-ripple-web-index"></a>')
    sec11_lines.append("## SECTION 11: THE MACRO POLICY RIPPLE & SYSTEMIC WEB INDEX")
    sec11_lines.append("*Exhaustive systemic mapping of multi-ministerial policy propagation, cross-sectoral economic cascades, and the 5 Legal Tiers of the Union Executive apparatus.*")
    sec11_lines.append("")
    sec11_lines.append("### PART A: THE 15 CANONICAL INTER-MINISTERIAL POLICY RIPPLE CHAINS")
    sec11_lines.append("Each ripple chain documents the exact operational transmission sequence of high-velocity Union policies across collaborating and regulating nodal ministries.")
    sec11_lines.append("")

    for i, chain in enumerate(chains, 1):
        cid = chain.get("chain_id", f"CHAIN_{i}")
        title = chain.get("title", "")
        pillar = chain.get("primary_pillar", "")
        driver = chain.get("lead_driver", "")
        flow = chain.get("nodes_flow", [])
        dispatches = chain.get("linked_dispatches", [])

        sec11_lines.append(f"#### Ripple #{i:02d} // {title}")
        sec11_lines.append(f"**Chain Identifier:** `{cid}` | **Primary UPSC Pillar:** `{pillar}`  ")
        sec11_lines.append(f"> **Lead Policy Driver / Catalyst:** {driver}")
        sec11_lines.append("")
        sec11_lines.append("**Inter-Ministerial Propagation Vector:**")
        sec11_lines.append("")
        sec11_lines.append("| Step | Propagating Ministry / Body | Executive Mandate & Downstream Cascade |")
        sec11_lines.append("| :--- | :--- | :--- |")
        for s_idx, step in enumerate(flow, 1):
            m = step.get("ministry", "")
            act = step.get("action", "")
            sec11_lines.append(f"| **{s_idx:02d}** | **{m}** | {act} |")
        sec11_lines.append("")
        
        disp_str = ", ".join([f"`{d}`" for d in dispatches])
        sec11_lines.append(f"**Linked Primary Dispatches in Archive:** {disp_str}")
        sec11_lines.append("")
        sec11_lines.append("> [!TIP]")
        sec11_lines.append(f"> **Examiner Trap Neutralization Strategy:** When the examiner presents a question claiming that *{flow[0].get('ministry', 'the lead ministry')}* executes this entire initiative unilaterally, eliminate the choice. The policy cascades sequentially through {len(flow)} distinct regulatory nodes.")
        sec11_lines.append("")
        sec11_lines.append("---")
        sec11_lines.append("")

    # Part B: Legal Tiers Disambiguation
    sec11_lines.append("### PART B: THE 5 LEGAL TIERS ENTITY DISAMBIGUATION FRAMEWORK")
    sec11_lines.append("In UPSC Prelims, questions frequently confuse candidates by swapping the constitutional status, statutory parentage, or executive registration of state entities (e.g., claiming India Semiconductor Mission is an Act of Parliament, or SIDM is a statutory regulator).")
    sec11_lines.append("")
    sec11_lines.append("| Tier Number | Classification Tier | Constitutional / Legal Anchor | Key Entities Identified in Corpus | Trap Neutralized |")
    sec11_lines.append("| :---: | :--- | :--- | :--- | :--- |")
    sec11_lines.append("| **Tier 1** | **Constitutional Bodies** | Explicit Constitutional Articles (Art. 75, 324, 338, 280) | Election Commission of India (Art 324), Cabinet Secretariat (Art 75), National Commission for Scheduled Castes (Art 338), Finance Commission (Art 280) | Neutralizes `PSY_03_LEGAL_TIER` (falsely claimed to be a statutory creation of an ordinary Act) |")
    sec11_lines.append("| **Tier 2** | **Statutory Regulators & Authorities** | Enacted Acts of Parliament | Reserve Bank of India (RBI Act 1934), SEBI (SEBI Act 1992), National Human Rights Commission (PHRA 1993), Bureau of Indian Standards (BIS Act 2016), CPCB (Water Act 1974), CAQM (CAQM Act 2021) | Neutralizes `PSY_01_INST_SWAP` & statutory jurisdiction confusion |")
    sec11_lines.append("| **Tier 3** | **Executive Business Divisions & Missions** | Executive Notifications & Section 8 Companies under Line Ministries | India Semiconductor Mission (MeitY/DIC), PM GatiShakti NPG, National Green Hydrogen Mission (MNRE), Digital India Bhashini Division | Neutralizes `PSY_03_LEGAL_TIER` (examiner falsely claiming statutory status for executive mission secretariats) |")
    sec11_lines.append("| **Tier 4** | **Registered Societies & Industry Associations** | Societies Registration Act, 1860 / Non-Profit Chambers | Society of Indian Defence Manufacturers (SIDM), Textiles Committee, National RUDSETI Academy (NAR) | Neutralizes `PSY_01_INST_SWAP` (falsely claiming an industry lobby is a direct departmental organ of MoD) |")
    sec11_lines.append("| **Tier 5** | **Commercial PSUs & Strategic Enterprises** | Companies Act, 2013 / Section 617 CPSEs | Uranium Corporation of India Limited (UCIL), Coal India Limited, IDBI Bank Limited | Neutralizes regulatory vs commercial confusion in disinvestment and strategic resource management |")
    sec11_lines.append("")
    sec11_lines.append("---")
    sec11_lines.append("")
    sec11_lines.append("### END OF COMPENDIUM // COMPILED AND VERIFIED BY TARK INTELLIGENCE ENGINE")
    sec11_lines.append("*(C) 2026 Tark 1.0 — Strict Verification & Academic Grounding Engine.*")
    sec11_lines.append("")

    full_output = compendium.rstrip() + "\n" + "\n".join(sec11_lines)

    with open(COMPENDIUM_PATH, "w", encoding="utf-8") as f:
        f.write(full_output)

    print(f"Successfully updated compendium: {len(full_output)} bytes written.")

if __name__ == "__main__":
    main()
