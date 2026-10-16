import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

export interface SeedRippleNode {
  ring_depth: number; // 0: Origin, 1: Statutory/Rules, 2: Inter-Ministerial Execution, 3: Federal/Rollout
  step_order: number;
  ministry: string;
  action: string;
  mutates_prior_fact?: boolean;
  dispatch_id?: string;
  pib_url?: string;
}

export interface SeedRippleChain {
  chain_id: string;
  title: string;
  node_id: string; // Foreign key to public.syllabus_nodes(id)
  primary_pillar: string;
  lead_driver: string;
  historical_twin_pyq_id?: string | null;
  status: 'active' | 'dormant' | 'resolved';
  has_sync_debt: boolean;
  nodes_flow: SeedRippleNode[];
  linked_dispatches: string[];
}

export interface SeedEntityRecord {
  entity_slug: string;
  authority: string;
  aliases: string[];
  parent_ministry: string;
  appearances_count: number;
  tier_number: number;
  tier_name: string;
  parent_statute_or_article?: string;
  tier_description: string;
  neutralized_trap: string;
  trap_explanation: string;
}

export const CANONICAL_CHAINS_GRAPH: SeedRippleChain[] = [
  {
    chain_id: 'CHAIN_01_SEMICON_NEXUS',
    title: 'The Semiconductor Ecosystem & Critical Materials Nexus',
    node_id: 'GS3.SCI.IT_COMP',
    primary_pillar: 'GS3 Science & Economy',
    lead_driver: 'Cabinet approval of Semicon 2.0 with ₹1.27 Lakh Crore outlay and domestic component localization.',
    historical_twin_pyq_id: 'UPSC_PRE_2023_GS1_Q0504',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Cabinet / PMO', action: 'Announced Semicon 2.0 guidelines and national AI computing infrastructure mission.', dispatch_id: 'DISP_001_SEMICON_ROOT' },
      { ring_depth: 1, step_order: 1, ministry: 'Ministry of Power', action: 'Notified 552 GW non-fossil capacity target and ultra-reliable industrial grid standards for fabs.', dispatch_id: 'DISP_018_POWER_AI' },
      { ring_depth: 1, step_order: 2, ministry: 'Ministry of Mines', action: 'Auctioned offshore critical minerals (Lithium, Rare Earths, Silicon) for chip substrate inputs.', dispatch_id: 'DISP_021_MINES_AUCTION' },
      { ring_depth: 2, step_order: 3, ministry: 'Ministry of Steel', action: 'Implemented green steel ship-recycling circulars to supply low-carbon structural housing.', dispatch_id: 'DISP_019_STEEL_CIRCULAR' },
      { ring_depth: 2, step_order: 4, ministry: 'MeitY / ISM', action: 'Operationalized 5 approved semiconductor units and notified the ₹40,000 Cr ECMS scheme.', dispatch_id: 'DISP_022_ECMS_NOTIF' },
      { ring_depth: 3, step_order: 5, ministry: 'Ministry of Commerce', action: 'Negotiated duty-free reciprocal access in New Zealand & Tajikistan FTAs for electronics.', dispatch_id: 'DISP_024_FTA_ELEC' },
      { ring_depth: 3, step_order: 6, ministry: 'Reserve Bank of India', action: 'Calibrated overnight VRRR auctions to absorb massive foreign direct capex inflows.', dispatch_id: 'DISP_229_VRRR_ABSORB' },
    ],
    linked_dispatches: [
      'Dispatch #001 (BHAVYA 51:49 Clusters)',
      'Dispatch #018 (Power for AI Engagements)',
      'Dispatch #021 (Semiconductor CEO Roundtable)',
      'Dispatch #022 (ECMS Component Scheme)',
      'Dispatch #024 (India-NZ Free Trade Agreement)',
      'Dispatch #229 (Semicon India 2026 Conclave)',
    ],
  },
  {
    chain_id: 'CHAIN_02_CIRCULAR_EWASTE',
    title: 'Circular Economy & Industrial Effluent Compliance Cascades',
    node_id: 'GS3.ENV.POLLUTION',
    primary_pillar: 'GS3 Environment & GS2 Governance',
    lead_driver: 'Special Campaign 6.0 and nationwide enforcement of E-Waste (Management) Rules, 2022.',
    historical_twin_pyq_id: 'UPSC_PRE_2023_GS1_Q0506',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Cabinet Secretariat', action: 'Approved national e-waste compliance and institutional record-clearing guidelines under Special Campaign 6.0.', dispatch_id: 'DISP_493_EWASTE_ROOT' },
      { ring_depth: 1, step_order: 1, ministry: 'MoEFCC / CPCB', action: 'Notified strict extended producer responsibility (EPR) recycling targets.', dispatch_id: 'DISP_039_EPR_TARGETS' },
      { ring_depth: 2, step_order: 2, ministry: 'Ministry of Steel', action: 'Mandated institutional segregation and electronic disposal across all public steel plants.', dispatch_id: 'DISP_019_STEEL_DISPOSAL' },
      { ring_depth: 2, step_order: 3, ministry: 'MeitY', action: 'Directed electronics manufacturers and GeM vendors to supply certified recyclable devices.', dispatch_id: 'DISP_457_GEM_RECYCLABLE' },
      { ring_depth: 3, step_order: 4, ministry: 'Ministry of Law & Justice', action: 'Conducted judicial and legislative record disposal workshops at Kartavya Bhawan.', dispatch_id: 'DISP_493_KB_WORKSHOPS' },
    ],
    linked_dispatches: [
      'Dispatch #019 (Steel E-Waste)',
      'Dispatch #039 (ECL Sustainability)',
      'Dispatch #457 (Namami Gange Pollution)',
      'Dispatch #493 (E-Waste Kartavya Bhawan)',
    ],
  },
  {
    chain_id: 'CHAIN_03_DEFENSE_EXPORT_SURGE',
    title: 'Defense Indigenization & Private Sector Export Explosion',
    node_id: 'GS3.SCI.DEFENCE',
    primary_pillar: 'GS3 Security & Economy',
    lead_driver: 'Defense exports reaching all-time high of ₹38,424 Crore in FY 2025-26 under DAP indigenization lists.',
    historical_twin_pyq_id: 'UPSC_PRE_2024_GS1_Q0505',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Cabinet Committee on Security (CCS)', action: 'Approved higher capital acquisition budget allocation for domestic vendors and fourth positive indigenization list.', dispatch_id: 'DISP_421_CCS_INDIG' },
      { ring_depth: 1, step_order: 1, ministry: 'Ministry of Defence', action: 'Presented SIDM Champion Awards 2026 to incentivize private defense R&D.', dispatch_id: 'DISP_421_SIDM_AWARDS' },
      { ring_depth: 2, step_order: 2, ministry: 'DRDO & Ordnance', action: 'Transferred missile propulsion and radar technology packages to private consortia.', dispatch_id: 'DISP_241_DRDO_TOT' },
      { ring_depth: 3, step_order: 3, ministry: 'Indian Navy', action: 'Showcased indigenous stealth assets (INS Sahyadri, INS Kulish) at AIME-2026 in Philippines.', dispatch_id: 'DISP_361_NAVY_AIME' },
      { ring_depth: 3, step_order: 4, ministry: 'Ministry of Commerce / DGFT', action: 'Streamlined military export authorizations toward ₹50,000 Crore 2029 target.', dispatch_id: 'DISP_433_DGFT_DEFENSE' },
    ],
    linked_dispatches: [
      'Dispatch #241 (Surya Kiran Aerobatics)',
      'Dispatch #361 (INS Sahyadri & Kulish at AIME-26)',
      'Dispatch #421 (SIDM Champion Awards 2026)',
      'Dispatch #433 (Ex-Servicemen Special Campaign)',
    ],
  },
  {
    chain_id: 'CHAIN_04_AGRI_MSP_COOP',
    title: 'Agrarian Price Stabilization & Primary Cooperative Modernization',
    node_id: 'GS3.AGRI.ECONOMICS',
    primary_pillar: 'GS3 Agriculture & GS2 Cooperation',
    lead_driver: 'Kharif price fixings, PM-KISAN biometric saturation, and PACS computerization.',
    historical_twin_pyq_id: 'UPSC_PRE_2023_GS1_Q0507',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Cabinet Committee on Economic Affairs', action: 'Approved Kharif Minimum Support Prices guaranteeing 1.5x production cost.', dispatch_id: 'DISP_008_CCEA_MSP' },
      { ring_depth: 1, step_order: 1, ministry: 'Ministry of Agriculture & FW', action: 'Disbursed PM-KISAN direct transfers and expanded digital crop insurance monitoring.', dispatch_id: 'DISP_020_AGRI_TRANSFER' },
      { ring_depth: 2, step_order: 2, ministry: 'Ministry of Cooperation', action: 'Connected Primary Agricultural Credit Societies (PACS) to common cloud accounting.', dispatch_id: 'DISP_349_PACS_CLOUD' },
      { ring_depth: 2, step_order: 3, ministry: 'Department of Fertilizers', action: 'Subsidized nano-urea and rationalized nutrient-based subsidies (NBS) for soil health.', dispatch_id: 'DISP_350_NBS_FERT' },
    ],
    linked_dispatches: [
      'Dispatch #008 (NAFED Welfare Suite)',
      'Dispatch #020 (Agri Development)',
      'Dispatch #349 (India-Netherlands Agri Pact)',
    ],
  },
  {
    chain_id: 'CHAIN_05_MONETARY_LIQUIDITY_CORRIDOR',
    title: 'Monetary Liquidity Corridor & Sovereign Balance Sheet Calibrations',
    node_id: 'GS3.ECO.MONETARY',
    primary_pillar: 'GS3 Economy & Monetary Policy',
    lead_driver: 'RBI Variable Rate Reverse Repo (VRRR) liquidity absorption and corporate reporting rigor.',
    historical_twin_pyq_id: 'UPSC_PRE_2024_GS1_Q0501',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Ministry of Finance', action: 'Tracked direct tax buoyant collections and maintained fiscal deficit trajectory at 4.9% of GDP.', dispatch_id: 'DISP_003_FIN_BUDGET' },
      { ring_depth: 1, step_order: 1, ministry: 'Reserve Bank of India (MPC)', action: 'Operated VRRR auctions at 5.49% to anchor short-term rates to policy repo.', dispatch_id: 'DISP_045_RBI_VRRR' },
      { ring_depth: 2, step_order: 2, ministry: 'National Financial Reporting Authority (NFRA)', action: 'Enforced audit quality and technology assurance across corporate books.', dispatch_id: 'DISP_046_NFRA_AUDIT' },
      { ring_depth: 3, step_order: 3, ministry: 'Ministry of Corporate Affairs', action: 'Expanded learner registrations for corporate governance and insolvency norms.', dispatch_id: 'DISP_047_MCA_INSOLVENCY' },
    ],
    linked_dispatches: [
      'Dispatch #003 (DigiDukaan Platform)',
      'Dispatch #045 (NFRA Audit Quality)',
      'Dispatch #046 (MCA Registrations)',
    ],
  },
  {
    chain_id: 'CHAIN_06_GREEN_HYDROGEN_SIGHT',
    title: 'National Green Hydrogen Mission & Electrolyser Supply Chain',
    node_id: 'GS3.ENV.ENERGY_TRANS',
    primary_pillar: 'GS3 Environment & Energy',
    lead_driver: 'Strategic Interventions for Green Hydrogen Transition (SIGHT) tenders under MNRE.',
    historical_twin_pyq_id: 'UPSC_PRE_2023_GS1_Q0504',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Union Cabinet', action: 'Sanctioned National Green Hydrogen Mission with ₹19,744 Crore outlay.', dispatch_id: 'DISP_038_NGHM_ROOT' },
      { ring_depth: 1, step_order: 1, ministry: 'MNRE', action: 'Allocated electrolyser manufacturing capacity under Component I of SIGHT mission.', dispatch_id: 'DISP_038_SIGHT_TENDERS' },
      { ring_depth: 2, step_order: 2, ministry: 'Ministry of Petroleum & NG', action: 'Mandated green hydrogen blending in public sector refinery operations.', dispatch_id: 'DISP_253_PNG_BLENDING' },
      { ring_depth: 2, step_order: 3, ministry: 'Ministry of Power', action: 'Granted open-access green energy transmission waivers for hydrogen production.', dispatch_id: 'DISP_254_POWER_WAIVERS' },
    ],
    linked_dispatches: [
      'Dispatch #038 (Geothermal Energy Policy)',
      'Dispatch #253 (Telecom Manufacturing Investments)',
    ],
  },
  {
    chain_id: 'CHAIN_07_GATISHAKTI_LOGISTICS',
    title: 'PM GatiShakti Multimodal Logistics & Transit De-bottlenecking',
    node_id: 'GS3.ECO.INFRA',
    primary_pillar: 'GS3 Infrastructure',
    lead_driver: 'Network Planning Group (NPG) integrated clearances across transport ministries.',
    historical_twin_pyq_id: 'UPSC_PRE_2024_GS1_Q0505',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Cabinet Secretariat / PMO', action: 'Mandated institutional GIS multi-layer mapping for all infrastructure projects above ₹500 Cr.', dispatch_id: 'DISP_029_GATISHAKTI_MANDATE' },
      { ring_depth: 1, step_order: 1, ministry: 'DPIIT / PM GatiShakti', action: 'Synchronized infrastructure corridors using GIS multi-layer mapping.', dispatch_id: 'DISP_029_NPG_CLEARANCE' },
      { ring_depth: 2, step_order: 2, ministry: 'Ministry of Railways', action: 'Expanded Kavach 4.0 train collision avoidance rollout and freight corridors.', dispatch_id: 'DISP_051_KAVACH_ROLLOUT' },
      { ring_depth: 2, step_order: 3, ministry: 'Ministry of Road Transport & Highways', action: 'Monetized highway stretches and expedited economic corridor tunnels.', dispatch_id: 'DISP_052_MORTH_TUNNELS' },
      { ring_depth: 3, step_order: 4, ministry: 'Ministry of Ports & Shipping', action: 'Commissioned zero-emission green port tugs and coastal shipping nodes.', dispatch_id: 'DISP_053_PORTS_TUGS' },
    ],
    linked_dispatches: [
      'Dispatch #029 (Zero Emission Green Shipping)',
      'Dispatch #051 (CRRI Urban Pavement Tech)',
    ],
  },
  {
    chain_id: 'CHAIN_08_AYUSH_UNIVERSAL_HEALTH',
    title: 'Universal Senior Healthcare & Traditional Medicine Integration',
    node_id: 'GS2.SOCJ.HEALTH',
    primary_pillar: 'GS2 Social Justice & Health',
    lead_driver: 'Expansion of Ayushman Bharat to senior citizens aged 70+ and 11th Ayurveda Day.',
    historical_twin_pyq_id: 'UPSC_PRE_2023_GS1_Q0506',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Union Cabinet / PMO', action: 'Approved universal health coverage for all citizens aged 70+ regardless of socio-economic bracket.', dispatch_id: 'DISP_032_AB_SENIOR_ROOT' },
      { ring_depth: 1, step_order: 1, ministry: 'Ministry of Ayush', action: 'Organized 11th Ayurveda Day globally and standardized CCRAS pharmacopoeia.', dispatch_id: 'DISP_047_AYUSH_CCRAS' },
      { ring_depth: 2, step_order: 2, ministry: 'National Health Authority', action: 'Digitized electronic health records under the Ayushman Bharat Digital Mission.', dispatch_id: 'DISP_265_NHA_DIGITAL' },
    ],
    linked_dispatches: [
      'Dispatch #032 (Health Infrastructure Updates)',
      'Dispatch #047 (CCRAS Internal Finance)',
      'Dispatch #265 (11th Ayurveda Day Mandate)',
    ],
  },
  {
    chain_id: 'CHAIN_09_DEEP_OCEAN_BLUE_ECONOMY',
    title: 'Deep Ocean Mission & Polymetallic Nodules Exploration',
    node_id: 'GS3.SCI',
    primary_pillar: 'GS3 Science & Technology',
    lead_driver: 'Samudrayaan manned submersible trials at 6,000m depth and seabed mining codes under MoES.',
    historical_twin_pyq_id: 'UPSC_PRE_2024_GS1_Q0501',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Cabinet Committee on Economic Affairs', action: 'Sanctioned multi-year Deep Ocean Mission with ₹4,077 Cr outlay.', dispatch_id: 'DISP_050_DOM_ROOT' },
      { ring_depth: 1, step_order: 1, ministry: 'Ministry of Earth Sciences (MoES)', action: 'Tested Matsya-6000 titanium hull acoustic positioning systems.', dispatch_id: 'DISP_050_MATSYA_TRIAL' },
      { ring_depth: 2, step_order: 2, ministry: 'Ministry of Mines', action: 'Mapped central Indian Ocean seabed polymetallic nodule coordinates.', dispatch_id: 'DISP_112_MINES_NODULES' },
      { ring_depth: 3, step_order: 3, ministry: 'Ministry of External Affairs', action: 'Secured International Seabed Authority (ISA) exploration rights.', dispatch_id: 'DISP_180_MEA_ISA' },
    ],
    linked_dispatches: [
      'Dispatch #050 (Deep Ocean Mission Trials)',
      'Dispatch #112 (Critical Metals Seabed)',
      'Dispatch #180 (ISA International Seabed)',
    ],
  },
  {
    chain_id: 'CHAIN_10_CRITICAL_MINERALS_OFFSHORE',
    title: 'Offshore Critical Minerals & Critical Asset Securitization',
    node_id: 'GS3.ECO.GROWTH',
    primary_pillar: 'GS3 Economy & Security',
    lead_driver: 'Offshore Areas Mineral (Development and Regulation) Amendment Act auctions.',
    historical_twin_pyq_id: 'UPSC_PRE_2023_GS1_Q0504',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Parliament of India', action: 'Enacted Offshore Areas Mineral (Development and Regulation) Amendment Act.', dispatch_id: 'DISP_075_OFFSHORE_ACT' },
      { ring_depth: 1, step_order: 1, ministry: 'Ministry of Mines', action: 'Released 13 offshore mineral auction blocks for composite licenses.', dispatch_id: 'DISP_075_AUCTION_BLOCKS' },
      { ring_depth: 2, step_order: 2, ministry: 'Geological Survey of India', action: 'Conducted high-resolution aeromagnetic baseline surveys across territorial waters.', dispatch_id: 'DISP_134_GSI_SURVEYS' },
      { ring_depth: 3, step_order: 3, ministry: 'Indian Coast Guard / MoD', action: 'Provided exclusive economic zone maritime security patrol coverage for seismic vessels.', dispatch_id: 'DISP_210_ICG_PATROL' },
    ],
    linked_dispatches: [
      'Dispatch #075 (Offshore Mineral Blocks)',
      'Dispatch #134 (GSI Baseline Exploration)',
      'Dispatch #210 (Coast Guard Surveillance)',
    ],
  },
  {
    chain_id: 'CHAIN_11_DATA_PROTECTION_DPDP',
    title: 'Digital Personal Data Protection & Consent Governance',
    node_id: 'GS2.GOV.E_GOV',
    primary_pillar: 'GS2 Governance & Rights',
    lead_driver: 'Operationalization of Data Protection Board of India under DPDP Act, 2023.',
    historical_twin_pyq_id: 'UPSC_PRE_2024_GS1_Q0505',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Parliament of India', action: 'Passed Digital Personal Data Protection Act, 2023.', dispatch_id: 'DISP_088_DPDP_ACT' },
      { ring_depth: 1, step_order: 1, ministry: 'MeitY', action: 'Notified draft rules for verifiable parental consent and data fiduciaries.', dispatch_id: 'DISP_088_DRAFT_RULES' },
      { ring_depth: 2, step_order: 2, ministry: 'Data Protection Board of India', action: 'Established digital portal for automated inquiry and penalty adjudication.', dispatch_id: 'DISP_165_DPB_PORTAL' },
      { ring_depth: 3, step_order: 3, ministry: 'CERT-In', action: 'Interfaced mandatory 6-hour cybersecurity incident reporting with DPDP guidelines.', dispatch_id: 'DISP_220_CERT_REPORTING' },
    ],
    linked_dispatches: [
      'Dispatch #088 (DPDP Rules Notification)',
      'Dispatch #165 (Data Protection Board Setup)',
      'Dispatch #220 (Cybersecurity Compliance)',
    ],
  },
  {
    chain_id: 'CHAIN_12_TEXTILE_MEGA_PARKS_MITRA',
    title: 'PM MITRA Integrated Mega Textile Parks & Export Scale',
    node_id: 'GS3.ECO.INFRA',
    primary_pillar: 'GS3 Economy & Employment',
    lead_driver: 'Establishment of 7 PM MITRA parks with 5F vision: Farm to Fibre to Factory to Fashion to Foreign.',
    historical_twin_pyq_id: 'UPSC_PRE_2023_GS1_Q0507',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Union Cabinet', action: 'Approved Scheme for PM Mega Integrated Textile Region and Apparel (PM MITRA) Parks.', dispatch_id: 'DISP_092_MITRA_ROOT' },
      { ring_depth: 1, step_order: 1, ministry: 'Ministry of Textiles', action: 'Executed SPV agreements across 7 state governments with 51:49 equity participation.', dispatch_id: 'DISP_092_SPV_AGREEMENT' },
      { ring_depth: 2, step_order: 2, ministry: 'Textiles Committee', action: 'Mandated laboratory accreditation and zero-defect zero-effect (ZED) quality auditing.', dispatch_id: 'DISP_144_TEXTILES_COMM' },
      { ring_depth: 3, step_order: 3, ministry: 'Ministry of Commerce', action: 'Integrated MITRA logistics hubs with dedicated rail freight sidings under PM GatiShakti.', dispatch_id: 'DISP_230_MITRA_LOGISTICS' },
    ],
    linked_dispatches: [
      'Dispatch #092 (PM MITRA SPV Framework)',
      'Dispatch #144 (Textile Quality Certification)',
      'Dispatch #230 (Textile Export Freight)',
    ],
  },
  {
    chain_id: 'CHAIN_13_DISASTER_RESILIENT_INFRA',
    title: 'Coalition for Disaster Resilient Infrastructure & Urban Safety',
    node_id: 'GS3.DIS.FRAMEWORK',
    primary_pillar: 'GS3 Disaster Management',
    lead_driver: 'Deployment of Infrastructure for Resilient Island States (IRIS) and national early warning systems.',
    historical_twin_pyq_id: 'UPSC_PRE_2024_GS1_Q0501',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Prime Minister Office (PMO)', action: 'Chartered Coalition for Disaster Resilient Infrastructure (CDRI) international treaty status.', dispatch_id: 'DISP_104_CDRI_CHARTER' },
      { ring_depth: 1, step_order: 1, ministry: 'NDMA / MHA', action: 'Notified National Disaster Management Guidelines for urban flood and heatwave prevention.', dispatch_id: 'DISP_104_NDMA_HEATWAVE' },
      { ring_depth: 2, step_order: 2, ministry: 'Ministry of Housing & Urban Affairs', action: 'Mandated climate-resilient building codes across Smart Cities mission renewals.', dispatch_id: 'DISP_188_MOHUA_CODES' },
      { ring_depth: 3, step_order: 3, ministry: 'IMD / MoES', action: 'Operationalized 10 new X-Band Doppler Weather Radars in Himalayan states.', dispatch_id: 'DISP_245_IMD_RADARS' },
    ],
    linked_dispatches: [
      'Dispatch #104 (CDRI Resilience Fund)',
      'Dispatch #188 (Urban Climate Resilient Codes)',
      'Dispatch #245 (Doppler Weather Radars)',
    ],
  },
  {
    chain_id: 'CHAIN_14_INDO_PACIFIC_SUPPLY_CHAINS',
    title: 'Indo-Pacific Economic Framework & Supply Chain Resilience',
    node_id: 'GS2.IR.MARITIME',
    primary_pillar: 'GS2 International Relations',
    lead_driver: 'Ratification of IPEF Supply Chain Agreement and Clean Economy Pillar commitments.',
    historical_twin_pyq_id: 'UPSC_PRE_2023_GS1_Q0506',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Union Cabinet / MEA', action: 'Ratified IPEF Pillar-II Supply Chain Agreement.', dispatch_id: 'DISP_118_IPEF_RATIFIED' },
      { ring_depth: 1, step_order: 1, ministry: 'Ministry of Commerce & Industry', action: 'Convened first IPEF Supply Chain Council emergency crisis response simulation.', dispatch_id: 'DISP_118_IPEF_COUNCIL' },
      { ring_depth: 2, step_order: 2, ministry: 'Ministry of Ports & Shipping', action: 'Expedited deep-water container transshipment port terminals at Galathea Bay.', dispatch_id: 'DISP_192_GALATHEA_PORT' },
      { ring_depth: 3, step_order: 3, ministry: 'CBIC / Dept of Revenue', action: 'Automated Authorized Economic Operator (AEO) reciprocal customs clearances.', dispatch_id: 'DISP_260_AEO_CUSTOMS' },
    ],
    linked_dispatches: [
      'Dispatch #118 (IPEF Supply Chain Treaty)',
      'Dispatch #192 (Galathea Bay Port)',
      'Dispatch #260 (AEO Customs Fast-Track)',
    ],
  },
  {
    chain_id: 'CHAIN_15_SPACE_COMMERCIALIZATION',
    title: 'Space Economy Commercialization & IN-SPACe Authorizations',
    node_id: 'GS3.SCI.SPACE',
    primary_pillar: 'GS3 Science & Technology',
    lead_driver: 'Indian Space Policy 2023 and notification of FDI liberalizations for satellite manufacturing.',
    historical_twin_pyq_id: 'UPSC_PRE_2024_GS1_Q0505',
    status: 'active',
    has_sync_debt: false,
    nodes_flow: [
      { ring_depth: 0, step_order: 0, ministry: 'Cabinet / Department of Atomic Energy & Space', action: 'Approved Indian Space Policy 2023 and 100% FDI in satellite manufacturing under automatic route.', dispatch_id: 'DISP_125_SPACE_POLICY' },
      { ring_depth: 1, step_order: 1, ministry: 'IN-SPACe', action: 'Authorized private launch vehicles and allocated launch pads at Kulasekarapattinam.', dispatch_id: 'DISP_125_INSPACE_AUTH' },
      { ring_depth: 2, step_order: 2, ministry: 'NewSpace India Limited (NSIL)', action: 'Commercialized LVM3 launch slots for global satellite constellation deployments.', dispatch_id: 'DISP_198_NSIL_COMMERCIAL' },
      { ring_depth: 3, step_order: 3, ministry: 'ISRO', action: 'Conducted technology transfer of Small Satellite Launch Vehicle (SSLV) to private consortia.', dispatch_id: 'DISP_272_SSLV_TOT' },
    ],
    linked_dispatches: [
      'Dispatch #125 (IN-SPACe Private Launch Pad)',
      'Dispatch #198 (NSIL Global Contracts)',
      'Dispatch #272 (SSLV Industry Transfer)',
    ],
  },
];

export const CANONICAL_ENTITIES_GRAPH: SeedEntityRecord[] = [
  {
    entity_slug: 'ENT_ECI',
    authority: 'Election Commission of India (ECI)',
    aliases: ['ECI', 'Election Commission'],
    parent_ministry: 'Ministry of Law and Justice (Admin liaison)',
    appearances_count: 12,
    tier_number: 1,
    tier_name: 'Constitutional Body',
    parent_statute_or_article: 'Article 324 of the Constitution of India',
    tier_description: 'Autonomous, permanent constitutional organ responsible for superintendence, direction, and control of elections to Parliament, State Legislatures, and the offices of President and Vice-President.',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Examiners falsely claim ECI was created under the Representation of the People Act, 1951, obscuring its Article 324 constitutional root.',
  },
  {
    entity_slug: 'ENT_NCSC',
    authority: 'National Commission for Scheduled Castes (NCSC)',
    aliases: ['NCSC', 'Scheduled Castes Commission'],
    parent_ministry: 'Ministry of Social Justice and Empowerment',
    appearances_count: 8,
    tier_number: 1,
    tier_name: 'Constitutional Body',
    parent_statute_or_article: 'Article 338 of the Constitution of India',
    tier_description: 'Direct constitutional grievance redressal powers with civil court powers during enquiry into atrocities or deprivation of rights.',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Swapping constitutional creation under Article 338 with statutory commission acts like NHRC or NCW.',
  },
  {
    entity_slug: 'ENT_CABSEC',
    authority: 'Cabinet Secretariat',
    aliases: ['CabSec', 'Cabinet Sec'],
    parent_ministry: 'Prime Minister of India (Direct Supervision)',
    appearances_count: 22,
    tier_number: 1,
    tier_name: 'Constitutional / Allocation of Business Organ',
    parent_statute_or_article: 'Article 77(3) of the Constitution and Allocation of Business Rules, 1961',
    tier_description: 'Administered directly under the Prime Minister. Manages secretarial assistance to Cabinet and inter-ministerial coordination.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Confusing Cabinet Secretariat with the Prime Minister Office (PMO) or Ministry of Parliamentary Affairs.',
  },
  {
    entity_slug: 'ENT_RBI',
    authority: 'Reserve Bank of India (RBI)',
    aliases: ['RBI', 'Reserve Bank'],
    parent_ministry: 'Ministry of Finance (Statutory Interface)',
    appearances_count: 103,
    tier_number: 2,
    tier_name: 'Statutory Apex Regulator',
    parent_statute_or_article: 'Reserve Bank of India Act, 1934',
    tier_description: 'Statutory central bank and monetary regulator governing currency issuance, bank licensing, foreign exchange, and policy rates.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Swapping RBI regulatory powers with SEBI, NPCI, or Ministry of Finance divisions.',
  },
  {
    entity_slug: 'ENT_NFRA',
    authority: 'National Financial Reporting Authority (NFRA)',
    aliases: ['NFRA', 'Financial Reporting Authority'],
    parent_ministry: 'Ministry of Corporate Affairs',
    appearances_count: 9,
    tier_number: 2,
    tier_name: 'Statutory Apex Regulator',
    parent_statute_or_article: 'Section 132 of the Companies Act, 2013',
    tier_description: 'Quasi-judicial corporate auditor regulator with independent investigation and debarment powers over public interest entities.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Confusing NFRA with the ICAI professional body or an internal administrative wing of MCA.',
  },
  {
    entity_slug: 'ENT_BIS',
    authority: 'Bureau of Indian Standards (BIS)',
    aliases: ['BIS', 'Standards Bureau'],
    parent_ministry: 'Ministry of Consumer Affairs, Food & Public Distribution',
    appearances_count: 26,
    tier_number: 2,
    tier_name: 'Statutory National Standards Body',
    parent_statute_or_article: 'Bureau of Indian Standards Act, 2016',
    tier_description: 'Statutory body operating under Ministry of Consumer Affairs for product standardization, hallmark verification, and laboratory testing.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Asserting BIS is an executive wing of Ministry of Commerce or MSME.',
  },
  {
    entity_slug: 'ENT_CAQM',
    authority: 'Commission for Air Quality Management (CAQM)',
    aliases: ['CAQM', 'NCR Air Quality Commission'],
    parent_ministry: 'Ministry of Environment, Forest and Climate Change',
    appearances_count: 15,
    tier_number: 2,
    tier_name: 'Statutory Environmental Commission',
    parent_statute_or_article: 'Commission for Air Quality Management in NCR and Adjoining Areas Act, 2021',
    tier_description: 'Replaced EPCA with statutory powers superseding state pollution boards across Delhi, Haryana, Punjab, Rajasthan, and UP.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Confusing CAQM statutory executive powers with CPCB advisory limits or NGT judicial orders.',
  },
  {
    entity_slug: 'ENT_ISM',
    authority: 'India Semiconductor Mission (ISM)',
    aliases: ['ISM', 'Semiconductor Mission'],
    parent_ministry: 'Ministry of Electronics and Information Technology (MeitY)',
    appearances_count: 34,
    tier_number: 3,
    tier_name: 'Executive Business Division',
    parent_statute_or_article: 'Executive Resolution under Digital India Corporation (Section 8 Company)',
    tier_description: 'Business Division under Digital India Corporation (MeitY). No separate Act of Parliament; operates as an executive nodal secretariat.',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Examiners falsely asserting that ISM was established by an Act of Parliament as a statutory regulator.',
  },
  {
    entity_slug: 'ENT_NPG',
    authority: 'PM GatiShakti Network Planning Group (NPG)',
    aliases: ['NPG', 'Network Planning Group'],
    parent_ministry: 'Ministry of Commerce & Industry (DPIIT)',
    appearances_count: 18,
    tier_number: 3,
    tier_name: 'Executive Business Division',
    parent_statute_or_article: 'Cabinet Resolution under DPIIT / PM GatiShakti National Master Plan',
    tier_description: 'Inter-ministerial coordination group under DPIIT. Synchronizes multi-modal connectivity projects without statutory veto powers.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Claiming NPG has independent statutory veto powers over state cabinet clearances.',
  },
  {
    entity_slug: 'ENT_SIDM',
    authority: 'Society of Indian Defence Manufacturers (SIDM)',
    aliases: ['SIDM', 'Defence Manufacturers Society'],
    parent_ministry: 'Ministry of Defence (Affiliated Industry Interface)',
    appearances_count: 14,
    tier_number: 4,
    tier_name: 'Registered Industry Society',
    parent_statute_or_article: 'Societies Registration Act, 1860',
    tier_description: 'Apex non-profit industry body representing public and private defense manufacturers. Not a government agency or statutory board.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Misattributing SIDM as a direct administrative department or PSU of the Ministry of Defence.',
  },
  {
    entity_slug: 'ENT_TEXTILES_COMM',
    authority: 'Textiles Committee',
    aliases: ['Textiles Committee'],
    parent_ministry: 'Ministry of Textiles',
    appearances_count: 7,
    tier_number: 4,
    tier_name: 'Statutory Body / Industry Facilitation Council',
    parent_statute_or_article: 'Textiles Committee Act, 1963',
    tier_description: 'Statutory body under Ministry of Textiles ensuring quality of textiles and textile machinery for domestic and export markets.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Confusing the statutory Textiles Committee with private non-statutory Export Promotion Councils.',
  },
  {
    entity_slug: 'ENT_UCIL',
    authority: 'Uranium Corporation of India Limited (UCIL)',
    aliases: ['UCIL', 'Uranium Corp'],
    parent_ministry: 'Department of Atomic Energy (DAE)',
    appearances_count: 6,
    tier_number: 5,
    tier_name: 'Public Sector Undertaking (PSU)',
    parent_statute_or_article: 'Companies Act, 1956 / 2013 (Central Public Sector Enterprise)',
    tier_description: 'Central Public Sector Enterprise (CPSE) under Department of Atomic Energy (DAE). Commercial corporate entity mining and processing uranium ore.',
    neutralized_trap: 'PSY_01_INST_SWAP',
    trap_explanation: 'Confusing UCIL commercial mining with the Atomic Energy Regulatory Board (AERB) nuclear safety regulator.',
  },
];

async function seedPolicyRippleGraph() {
  console.log('[Seed] Generating prebaked policy radar snapshot...');
  const snapshotData = {
    updated_at: new Date().toISOString(),
    total_chains: CANONICAL_CHAINS_GRAPH.length,
    total_entities: CANONICAL_ENTITIES_GRAPH.length,
    chains: CANONICAL_CHAINS_GRAPH,
    entities: CANONICAL_ENTITIES_GRAPH,
  };

  const snapshotPath = path.join(process.cwd(), 'src', 'data', 'policy-radar-snapshot.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');
  console.log(`[Seed] Successfully wrote ${snapshotPath} (${fs.statSync(snapshotPath).size} bytes)`);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log('[Seed] Supabase service key not detected. Snapshot generated cleanly. Skipping live DB write.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('[Seed] Syncing 15 canonical chains into public.policy_chains...');
  for (const c of CANONICAL_CHAINS_GRAPH) {
    const { error: chainErr } = await supabase.from('policy_chains').upsert({
      chain_id: c.chain_id,
      title: c.title,
      node_id: c.node_id,
      primary_pillar: c.primary_pillar,
      lead_driver: c.lead_driver,
      historical_twin_pyq_id: c.historical_twin_pyq_id,
      status: c.status,
      has_sync_debt: c.has_sync_debt,
      updated_at: new Date().toISOString(),
    });
    if (chainErr) {
      console.warn(`[Seed] Error upserting chain ${c.chain_id}:`, chainErr.message);
    }

    // Insert nodes
    for (const node of c.nodes_flow) {
      const { error: nodeErr } = await supabase.from('policy_chain_nodes').upsert({
        chain_id: c.chain_id,
        ring_depth: node.ring_depth,
        step_order: node.step_order,
        ministry: node.ministry,
        action: node.action,
        mutates_prior_fact: node.mutates_prior_fact || false,
        dispatch_id: node.dispatch_id || `${c.chain_id}_STEP_${node.step_order}`,
        pib_url: node.pib_url || null,
      });
      if (nodeErr) {
        console.warn(`[Seed] Error upserting node ${c.chain_id} step ${node.step_order}:`, nodeErr.message);
      }
    }
  }

  console.log('[Seed] Syncing 12 entities into public.policy_entities...');
  for (const e of CANONICAL_ENTITIES_GRAPH) {
    const { error: entityErr } = await supabase.from('policy_entities').upsert({
      entity_slug: e.entity_slug,
      authority: e.authority,
      aliases: e.aliases,
      parent_ministry: e.parent_ministry,
      appearances_count: e.appearances_count,
      tier_number: e.tier_number,
      tier_name: e.tier_name,
      parent_statute_or_article: e.parent_statute_or_article,
      tier_description: e.tier_description,
      neutralized_trap: e.neutralized_trap,
      trap_explanation: e.trap_explanation,
      last_seen_at: new Date().toISOString(),
    });
    if (entityErr) {
      console.warn(`[Seed] Error upserting entity ${e.entity_slug}:`, entityErr.message);
    }
  }

  console.log('[Seed] Database synchronization complete!');
}

seedPolicyRippleGraph().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
