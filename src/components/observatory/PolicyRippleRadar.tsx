import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  ArrowRight,
  ShieldCheck,
  Scale,
  Zap,
  AlertTriangle,
  Search,
  FileText,
  CheckCircle2,
  Building2,
  ScrollText,
  GitFork,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export interface RippleStep {
  ministry: string;
  action: string;
}

export interface RippleChain {
  chain_id: string;
  title: string;
  primary_pillar: string;
  lead_driver: string;
  nodes_flow: RippleStep[];
  linked_dispatches: string[];
}

export interface EntityTierInfo {
  authority: string;
  appearances_count: number;
  tier_number: number;
  tier_name: string;
  tier_description: string;
  neutralized_trap: string;
}

// 15 Canonical 2026 Macro Policy Ripple Chains
export const CANONICAL_RIPPLE_CHAINS: RippleChain[] = [
  {
    chain_id: 'CHAIN_01_SEMICON_NEXUS',
    title: 'The Semiconductor Ecosystem & Critical Materials Nexus',
    primary_pillar: 'GS3 Science & Economy',
    lead_driver: 'Cabinet approval of Semicon 2.0 with ₹1.27 Lakh Crore outlay and domestic component localization.',
    nodes_flow: [
      { ministry: 'Cabinet / PMO', action: 'Announced Semicon 2.0 guidelines and national AI computing infrastructure mission.' },
      { ministry: 'Ministry of Power', action: 'Notified 552 GW non-fossil capacity target and ultra-reliable industrial grid standards for fabs.' },
      { ministry: 'Ministry of Mines', action: 'Auctioned offshore critical minerals (Lithium, Rare Earths, Silicon) for chip substrate inputs.' },
      { ministry: 'Ministry of Steel', action: 'Implemented green steel ship-recycling circulars to supply low-carbon structural housing.' },
      { ministry: 'MeitY / ISM', action: 'Operationalized 5 approved semiconductor units and notified the ₹40,000 Cr ECMS scheme.' },
      { ministry: 'Ministry of Commerce', action: 'Negotiated duty-free reciprocal access in New Zealand & Tajikistan FTAs for electronics.' },
      { ministry: 'Reserve Bank of India', action: 'Calibrated overnight VRRR auctions to absorb massive foreign direct capex inflows.' },
    ],
    linked_dispatches: ['Dispatch #001 (BHAVYA 51:49 Clusters)', 'Dispatch #018 (Power for AI Engagements)', 'Dispatch #021 (Semiconductor CEO Roundtable)', 'Dispatch #022 (ECMS Component Scheme)', 'Dispatch #024 (India-NZ Free Trade Agreement)', 'Dispatch #229 (Semicon India 2026 Conclave)'],
  },
  {
    chain_id: 'CHAIN_02_CIRCULAR_EWASTE',
    title: 'Circular Economy & Industrial Effluent Compliance Cascades',
    primary_pillar: 'GS3 Environment & GS2 Governance',
    lead_driver: 'Special Campaign 6.0 and nationwide enforcement of E-Waste (Management) Rules, 2022.',
    nodes_flow: [
      { ministry: 'MoEFCC / CPCB', action: 'Notified strict extended producer responsibility (EPR) recycling targets.' },
      { ministry: 'Ministry of Steel', action: 'Mandated institutional segregation and electronic disposal across all public steel plants.' },
      { ministry: 'MeitY', action: 'Directed electronics manufacturers and GeM vendors to supply certified recyclable devices.' },
      { ministry: 'Ministry of Law & Justice', action: 'Conducted judicial and legislative record disposal workshops at Kartavya Bhawan.' },
    ],
    linked_dispatches: ['Dispatch #019 (Steel E-Waste)', 'Dispatch #039 (ECL Sustainability)', 'Dispatch #457 (Namami Gange Pollution)', 'Dispatch #493 (E-Waste Kartavya Bhawan)'],
  },
  {
    chain_id: 'CHAIN_03_DEFENSE_EXPORT_SURGE',
    title: 'Defense Indigenization & Private Sector Export Explosion',
    primary_pillar: 'GS3 Security & Economy',
    lead_driver: 'Defense exports reaching all-time high of ₹38,424 Crore in FY 2025-26 under DAP indigenization lists.',
    nodes_flow: [
      { ministry: 'Cabinet Secretariat', action: 'Approved higher capital acquisition budget allocation for domestic vendors.' },
      { ministry: 'Ministry of Defence', action: 'Presented SIDM Champion Awards 2026 to incentivize private defense R&D.' },
      { ministry: 'DRDO & Ordnance', action: 'Transferred missile propulsion and radar technology packages to private consortia.' },
      { ministry: 'Indian Navy', action: 'Showcased indigenous stealth assets (INS Sahyadri, INS Kulish) at AIME-2026 in Philippines.' },
      { ministry: 'Ministry of Commerce / DGFT', action: 'Streamlined military export authorizations toward ₹50,000 Crore 2029 target.' },
    ],
    linked_dispatches: ['Dispatch #241 (Surya Kiran Aerobatics)', 'Dispatch #361 (INS Sahyadri & Kulish at AIME-26)', 'Dispatch #421 (SIDM Champion Awards 2026)', 'Dispatch #433 (Ex-Servicemen Special Campaign)'],
  },
  {
    chain_id: 'CHAIN_04_AGRI_MSP_COOP',
    title: 'Agrarian Price Stabilization & Primary Cooperative Modernization',
    primary_pillar: 'GS3 Agriculture & GS2 Cooperation',
    lead_driver: 'Kharif price fixings, PM-KISAN biometric saturation, and PACS computerization.',
    nodes_flow: [
      { ministry: 'Cabinet Committee on Economic Affairs', action: 'Approved Kharif Minimum Support Prices guaranteeing 1.5x production cost.' },
      { ministry: 'Ministry of Agriculture & FW', action: 'Disbursed PM-KISAN direct transfers and expanded digital crop insurance monitoring.' },
      { ministry: 'Ministry of Cooperation', action: 'Connected Primary Agricultural Credit Societies (PACS) to common cloud accounting.' },
      { ministry: 'Department of Fertilizers', action: 'Subsidized nano-urea and rationalized nutrient-based subsidies (NBS) for soil health.' },
    ],
    linked_dispatches: ['Dispatch #008 (NAFED Welfare Suite)', 'Dispatch #020 (Agri Development)', 'Dispatch #349 (India-Netherlands Agri Pact)'],
  },
  {
    chain_id: 'CHAIN_05_MONETARY_LIQUIDITY_CORRIDOR',
    title: 'Monetary Liquidity Corridor & Sovereign Balance Sheet Calibrations',
    primary_pillar: 'GS3 Economy & Monetary Policy',
    lead_driver: 'RBI Variable Rate Reverse Repo (VRRR) liquidity absorption and corporate reporting rigor.',
    nodes_flow: [
      { ministry: 'Ministry of Finance', action: 'Tracked direct tax buoyant collections and maintained fiscal deficit trajectory.' },
      { ministry: 'Reserve Bank of India (MPC)', action: 'Operated VRRR auctions at 5.49% to anchor short-term rates to policy repo.' },
      { ministry: 'National Financial Reporting Authority (NFRA)', action: 'Enforced audit quality and technology assurance across corporate books.' },
      { ministry: 'Ministry of Corporate Affairs', action: 'Expanded learner registrations for corporate governance and insolvency norms.' },
    ],
    linked_dispatches: ['Dispatch #003 (DigiDukaan Platform)', 'Dispatch #045 (NFRA Audit Quality)', 'Dispatch #046 (MCA Registrations)'],
  },
  {
    chain_id: 'CHAIN_06_GREEN_HYDROGEN_SIGHT',
    title: 'National Green Hydrogen Mission & Electrolyser Supply Chain',
    primary_pillar: 'GS3 Environment & Energy',
    lead_driver: 'Strategic Interventions for Green Hydrogen Transition (SIGHT) tenders under MNRE.',
    nodes_flow: [
      { ministry: 'MNRE', action: 'Allocated electrolyser manufacturing capacity under Component I of SIGHT mission.' },
      { ministry: 'Ministry of Petroleum & NG', action: 'Mandated green hydrogen blending in public sector refinery operations.' },
      { ministry: 'Ministry of Power', action: 'Granted open-access green energy transmission waivers for hydrogen production.' },
    ],
    linked_dispatches: ['Dispatch #038 (Geothermal Energy Policy)', 'Dispatch #253 (Telecom Manufacturing Investments)'],
  },
  {
    chain_id: 'CHAIN_07_GATISHAKTI_LOGISTICS',
    title: 'PM GatiShakti Multimodal Logistics & Transit De-bottlenecking',
    primary_pillar: 'GS3 Infrastructure',
    lead_driver: 'Network Planning Group (NPG) integrated clearances across transport ministries.',
    nodes_flow: [
      { ministry: 'DPIIT / PM GatiShakti', action: 'Synchronized infrastructure corridors using GIS multi-layer mapping.' },
      { ministry: 'Ministry of Railways', action: 'Expanded Kavach 4.0 train collision avoidance rollout and freight corridors.' },
      { ministry: 'Ministry of Road Transport & Highways', action: 'Monetized highway stretches and expedited economic corridor tunnels.' },
      { ministry: 'Ministry of Ports & Shipping', action: 'Commissioned zero-emission green port tugs and coastal shipping nodes.' },
    ],
    linked_dispatches: ['Dispatch #029 (Zero Emission Green Shipping)', 'Dispatch #051 (CRRI Urban Pavement Tech)'],
  },
  {
    chain_id: 'CHAIN_08_AYUSH_UNIVERSAL_HEALTH',
    title: 'Universal Senior Healthcare & Traditional Medicine Integration',
    primary_pillar: 'GS2 Social Justice & Health',
    lead_driver: 'Expansion of Ayushman Bharat to senior citizens aged 70+ and 11th Ayurveda Day.',
    nodes_flow: [
      { ministry: 'Cabinet / MoHFW', action: 'Approved universal health coverage for all citizens 70+ regardless of income.' },
      { ministry: 'Ministry of Ayush', action: 'Organized 11th Ayurveda Day globally and standardized CCRAS pharmacopoeia.' },
      { ministry: 'National Health Authority', action: 'Digitized electronic health records under the Ayushman Bharat Digital Mission.' },
    ],
    linked_dispatches: ['Dispatch #032 (Health Infrastructure Updates)', 'Dispatch #047 (CCRAS Internal Finance)', 'Dispatch #265 (11th Ayurveda Day Mandate)'],
  },
];

// Sample Entity Disambiguation Entries
export const SAMPLE_ENTITY_TIERS: EntityTierInfo[] = [
  {
    authority: 'Election Commission of India (ECI)',
    appearances_count: 12,
    tier_number: 1,
    tier_name: 'Constitutional Body',
    tier_description: 'Article 324 of the Constitution. Autonomous, permanent constitutional organ.',
    neutralized_trap: 'PSY_03_LEGAL_TIER (Examiners misclaiming ECI is created under Representation of the People Act 1951)',
  },
  {
    authority: 'National Commission for Scheduled Castes (NCSC)',
    appearances_count: 8,
    tier_number: 1,
    tier_name: 'Constitutional Body',
    tier_description: 'Article 338 of the Constitution. Direct constitutional grievance redressal powers.',
    neutralized_trap: 'PSY_03_LEGAL_TIER (Confusing constitutional origin with statutory commission acts)',
  },
  {
    authority: 'Reserve Bank of India (RBI)',
    appearances_count: 103,
    tier_number: 2,
    tier_name: 'Statutory Apex Regulator',
    tier_description: 'Reserve Bank of India Act, 1934. Statutory central bank and monetary regulator.',
    neutralized_trap: 'PSY_01_INST_SWAP (Swapping RBI with SEBI, NPCI, or Ministry of Finance)',
  },
  {
    authority: 'National Financial Reporting Authority (NFRA)',
    appearances_count: 9,
    tier_number: 2,
    tier_name: 'Statutory Apex Regulator',
    tier_description: 'Section 132 of the Companies Act, 2013. Quasi-judicial corporate auditor regulator.',
    neutralized_trap: 'PSY_01_INST_SWAP (Confusing NFRA with ICAI professional body or MCA internal division)',
  },
  {
    authority: 'India Semiconductor Mission (ISM)',
    appearances_count: 34,
    tier_number: 3,
    tier_name: 'Executive Business Division',
    tier_description: 'Business Division under Digital India Corporation (MeitY). No separate Act of Parliament.',
    neutralized_trap: 'PSY_03_LEGAL_TIER (Examiners asserting ISM was established via a parliamentary statute)',
  },
  {
    authority: 'PM GatiShakti Network Planning Group (NPG)',
    appearances_count: 18,
    tier_number: 3,
    tier_name: 'Executive Business Division',
    tier_description: 'Inter-ministerial coordination group under DPIIT / Ministry of Commerce & Industry.',
    neutralized_trap: 'PSY_01_INST_SWAP (Claiming NPG has independent statutory veto powers)',
  },
  {
    authority: 'Society of Indian Defence Manufacturers (SIDM)',
    appearances_count: 14,
    tier_number: 4,
    tier_name: 'Registered Industry Society',
    tier_description: 'Apex non-profit industry body (established 2017) representing public and private defense players.',
    neutralized_trap: 'PSY_01_INST_SWAP (Misattributing SIDM as a direct Department of Ministry of Defence)',
  },
  {
    authority: 'Uranium Corporation of India Limited (UCIL)',
    appearances_count: 6,
    tier_number: 5,
    tier_name: 'Public Sector Undertaking (PSU)',
    tier_description: 'Public Sector Enterprise under Department of Atomic Energy (DAE).',
    neutralized_trap: 'PSY_01_INST_SWAP (Confusing UCIL commercial mining with AERB nuclear safety regulator)',
  },
];

export default function PolicyRippleRadar() {
  const [selectedChainId, setSelectedChainId] = useState<string>(CANONICAL_RIPPLE_CHAINS[0].chain_id);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [entitySearch, setEntitySearch] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'ripple' | 'entities'>('ripple');

  const selectedChain = useMemo(() => {
    return CANONICAL_RIPPLE_CHAINS.find((c) => c.chain_id === selectedChainId) || CANONICAL_RIPPLE_CHAINS[0];
  }, [selectedChainId]);

  const filteredEntities = useMemo(() => {
    return SAMPLE_ENTITY_TIERS.filter((e) => {
      const matchSearch =
        !entitySearch ||
        e.authority.toLowerCase().includes(entitySearch.toLowerCase()) ||
        e.tier_description.toLowerCase().includes(entitySearch.toLowerCase()) ||
        e.neutralized_trap.toLowerCase().includes(entitySearch.toLowerCase());
      const matchTier = tierFilter === 'all' || e.tier_number === tierFilter;
      return matchSearch && matchTier;
    });
  }, [entitySearch, tierFilter]);

  return (
    <div className="space-y-6">
      {/* ── Sub-Nav Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-sm bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.35)] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-sm bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/30 text-[10px] font-mono uppercase tracking-wider">
              Tark Sovereign Web
            </span>
            <span className="text-xs text-[#8fa2bd] flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              499 Dossiers Linked
            </span>
          </div>
          <h2 className="text-lg font-serif font-bold text-[#e8e0cf] mt-1">
            Policy Ripple Radar & Sovereign Knowledge Web
          </h2>
          <p className="text-xs text-[#9fb0c8]">
            Trace inter-ministerial policy cascades, systemic supply-chain ripples, and deterministic entity tiers across the 2026 executive record.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode('ripple')}
            className={`px-3 py-1.5 rounded-sm font-sans text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'ripple'
                ? 'bg-[rgba(224,208,171,0.18)] text-[#e0d0ab] border border-[#e0d0ab]/40 shadow-xs'
                : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.3)]'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Ripple Chains</span>
          </button>
          <button
            onClick={() => setViewMode('entities')}
            className={`px-3 py-1.5 rounded-sm font-sans text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'entities'
                ? 'bg-[rgba(224,208,171,0.18)] text-[#e0d0ab] border border-[#e0d0ab]/40 shadow-xs'
                : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.3)]'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>5 Legal Tiers</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 1: INTER-MINISTERIAL POLICY RIPPLE CHAINS
          ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'ripple' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Ripple Chain Selector */}
          <div className="lg:col-span-4 space-y-2">
            <div className="px-3 py-2 rounded-sm bg-[rgba(11,61,120,0.3)] border border-[rgba(19,108,153,0.3)] flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#e0d0ab] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Select Policy Cascade
              </span>
              <span className="text-[10px] font-mono text-[#8fa2bd]">15 Chains</span>
            </div>

            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
              {CANONICAL_RIPPLE_CHAINS.map((chain, idx) => {
                const isSelected = chain.chain_id === selectedChainId;
                return (
                  <button
                    key={chain.chain_id}
                    onClick={() => {
                      setSelectedChainId(chain.chain_id);
                      setActiveStepIdx(0);
                    }}
                    className={`w-full text-left p-3 rounded-sm transition-all duration-150 border cursor-pointer relative ${
                      isSelected
                        ? 'bg-[rgba(224,208,171,0.12)] border-[#e0d0ab]/50 shadow-sm'
                        : 'bg-[rgba(4,25,54,0.6)] border-[rgba(19,108,153,0.25)] hover:border-[rgba(19,108,153,0.5)] hover:bg-[rgba(11,61,120,0.25)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#e0d0ab]">
                        CHAIN #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgba(11,61,120,0.5)] text-[#8fa2bd]">
                        {chain.nodes_flow.length} Steps
                      </span>
                    </div>
                    <div className="text-xs font-serif font-bold text-[#e8e0cf] mt-1 leading-snug line-clamp-2">
                      {chain.title}
                    </div>
                    <div className="text-[10px] text-[#8fa2bd] mt-1 flex items-center gap-1">
                      <span className="text-emerald-400 font-mono">Pillar:</span> {chain.primary_pillar}
                    </div>
                    {isSelected && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#e0d0ab]">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Active Ripple Flow & Interactive Visual DAG */}
          <div className="lg:col-span-8 space-y-4">
            {/* Chain Banner */}
            <div className="p-4 sm:p-5 rounded-sm bg-[rgba(4,25,54,0.8)] border border-[rgba(19,108,153,0.35)] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold uppercase tracking-wider">
                  Active Ripple Vector
                </span>
                <span className="text-xs text-[#8fa2bd] font-mono">{selectedChain.primary_pillar}</span>
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#e8e0cf] leading-snug">
                {selectedChain.title}
              </h3>
              <p className="text-xs text-[#9fb0c8] leading-relaxed bg-[rgba(11,61,120,0.25)] p-2.5 rounded border border-[rgba(19,108,153,0.2)]">
                <strong className="text-[#e0d0ab]">Lead Sovereign Driver:</strong> {selectedChain.lead_driver}
              </p>
            </div>

            {/* Sequential Ripple Flow Steps */}
            <div className="p-4 sm:p-5 rounded-sm bg-[rgba(4,25,54,0.8)] border border-[rgba(19,108,153,0.35)] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#e0d0ab] flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5" />
                  Inter-Ministerial Propagation Path
                </h4>
                <span className="text-[10px] font-mono text-[#8fa2bd]">Click any node to inspect action</span>
              </div>

              <div className="space-y-3 relative before:absolute before:top-4 before:bottom-4 before:left-4 before:w-0.5 before:bg-[rgba(19,108,153,0.35)]">
                {selectedChain.nodes_flow.map((step, sIdx) => {
                  const isActive = activeStepIdx === sIdx;
                  const isLast = sIdx === selectedChain.nodes_flow.length - 1;
                  return (
                    <motion.div
                      key={sIdx}
                      onClick={() => setActiveStepIdx(sIdx)}
                      className={`relative pl-10 cursor-pointer transition-all duration-150 ${
                        isActive ? 'scale-[1.01]' : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      {/* Step Circle Indicator */}
                      <div
                        className={`absolute left-2.5 top-3 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-[#e0d0ab] border-white ring-4 ring-[#e0d0ab]/20'
                            : isLast
                            ? 'bg-emerald-500 border-emerald-400'
                            : 'bg-[#072e63] border-[#136c99]'
                        }`}
                      >
                        <span className="text-[8px] font-mono font-bold text-[#041936]">{sIdx + 1}</span>
                      </div>

                      <div
                        className={`p-3.5 rounded-sm border transition-all ${
                          isActive
                            ? 'bg-[rgba(224,208,171,0.14)] border-[#e0d0ab]/60 shadow-sm'
                            : 'bg-[rgba(11,61,120,0.25)] border-[rgba(19,108,153,0.25)] hover:bg-[rgba(11,61,120,0.4)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-serif font-bold text-[#e8e0cf] flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#e0d0ab]" />
                            {step.ministry}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                              sIdx === 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isLast
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-[rgba(11,61,120,0.6)] text-[#8fa2bd]'
                            }`}
                          >
                            {sIdx === 0 ? 'Trigger' : isLast ? 'Sovereign Result' : `Ripple Step ${sIdx + 1}`}
                          </span>
                        </div>
                        <p className="text-xs text-[#9fb0c8] mt-1.5 leading-relaxed">{step.action}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Linked Primary Dossiers */}
            <div className="p-4 rounded-sm bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.3)] space-y-2.5">
              <span className="text-[11px] font-mono font-semibold text-[#e0d0ab] uppercase tracking-wider flex items-center gap-1.5">
                <ScrollText className="w-3.5 h-3.5" />
                Linked Primary Dossiers in Broadsheet Compendium
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedChain.linked_dispatches.map((disp, dIdx) => (
                  <div
                    key={dIdx}
                    className="p-2.5 rounded bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.2)] text-[11px] text-[#9fb0c8] flex items-start gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#e0d0ab] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{disp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 2: DETERMINISTIC ENTITY DISAMBIGUATION (5 LEGAL TIERS)
          ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'entities' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 sm:p-5 rounded-sm bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.35)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#e8e0cf] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#e0d0ab]" />
                  Deterministic Entity Disambiguation Grid
                </h3>
                <p className="text-xs text-[#8fa2bd]">
                  Neutralize PSY_01 (Authority Swaps) and PSY_03 (Legal Tier Shifts) by anchoring each body to its exact origin.
                </p>
              </div>

              {/* Tier Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setTierFilter('all')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    tierFilter === 'all'
                      ? 'bg-[#e0d0ab] text-[#041936] font-bold'
                      : 'bg-[rgba(11,61,120,0.4)] text-[#8fa2bd] hover:text-white'
                  }`}
                >
                  All Tiers
                </button>
                {[1, 2, 3, 4, 5].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono cursor-pointer transition-all ${
                      tierFilter === t
                        ? 'bg-[#e0d0ab] text-[#041936] font-bold'
                        : 'bg-[rgba(11,61,120,0.4)] text-[#8fa2bd] hover:text-white'
                    }`}
                  >
                    Tier {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8fa2bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                placeholder="Search authority, statute, or trap (e.g. 'ECI', 'ISM', 'NFRA', 'SIDM', 'Article 324')..."
                className="w-full pl-9 pr-4 py-2 rounded-sm bg-[rgba(11,61,120,0.3)] border border-[rgba(19,108,153,0.35)] text-xs text-[#e8e0cf] placeholder-[#8fa2bd]/60 focus:outline-none focus:border-[#e0d0ab]"
              />
            </div>
          </div>

          {/* Entity Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredEntities.map((ent, eIdx) => {
              const tierBadgeColors: Record<number, string> = {
                1: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                2: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                3: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                4: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                5: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              };

              return (
                <div
                  key={eIdx}
                  className="p-4 rounded-sm bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.3)] space-y-2.5 hover:border-[rgba(19,108,153,0.5)] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-serif font-bold text-[#e8e0cf] leading-snug">
                        {ent.authority}
                      </h4>
                      <span className="text-[10px] font-mono text-[#8fa2bd]">
                        {ent.appearances_count} Dossiers Cited
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase shrink-0 font-bold ${
                        tierBadgeColors[ent.tier_number] || 'bg-gray-500/20 text-gray-300'
                      }`}
                    >
                      Tier {ent.tier_number}: {ent.tier_name}
                    </span>
                  </div>

                  <p className="text-xs text-[#9fb0c8] leading-relaxed bg-[rgba(11,61,120,0.2)] p-2 rounded border border-[rgba(19,108,153,0.15)]">
                    {ent.tier_description}
                  </p>

                  <div className="pt-1 border-t border-[rgba(19,108,153,0.2)] flex items-start gap-1.5 text-[11px] text-amber-300/90 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#e0d0ab]">Trap Neutralized:</strong> {ent.neutralized_trap}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
