/**
 * scripts/tests/fixtures/radar/legacy-boss-fallbacks.ts
 *
 * Retired legacy canonical boss MCQ fallbacks moved out of runtime code.
 * TASK_085O
 */

export const CANONICAL_BOSS_MCQ_FALLBACKS: Record<string, any> = {
  CHAIN_01_SEMICON_NEXUS: {
    stem: "With reference to the India Semiconductor Mission (ISM) and Semicon 2.0 architecture, consider the following statements:",
    statements: [
      "1. Under Semicon 2.0 guidelines approved by the Union Cabinet, fiscal support of up to 50% of project cost is extended on an equal pari-passu basis for setting up Silicon Semiconductor Fabs in India.",
      "2. The operationalization of compound semiconductor units and execution of the Electronic Components and Manufacturing Scheme (ECMS) is administered directly under the statutory authority of the Ministry of Heavy Industries.",
      "3. The India Semiconductor Mission (ISM) is a statutory regulatory body established pursuant to an Act of Parliament to adjudicate technology transfer disputes."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Cabinet Semicon 2.0 Approval / MeitY Notification ISM-2022/01",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "Sovereign Cabinet approval provides 50% capital subsidy on pari-passu basis for approved Silicon Fabs."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "Ministry of Heavy Industries",
        truth_key: "Ministry of Electronics and Information Technology (MeitY) / Digital India Corporation",
        anchor: "ECMS and ISM are administered directly by MeitY, NOT Ministry of Heavy Industries."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Tier-2 Statutory Regulatory Body pursuant to Act of Parliament",
        truth_key: "Tier-4 Autonomous Nodal Division / Society within Digital India Corporation",
        anchor: "ISM is an autonomous business division under Digital India Corporation (Section 8 company), NOT a statutory body established by Parliament."
      }
    ]
  },
  CHAIN_02_CIRCULAR_EWASTE: {
    stem: "With reference to the Extended Producer Responsibility (EPR) and Circular Economy framework for electrical and electronic equipment, consider the following statements:",
    statements: [
      "1. Under the E-Waste (Management) Rules, producers of electronic goods are mandated to achieve specified recycling targets through registered recyclers generating online EPR certificates.",
      "2. The centralized digital EPR portal for registering recycling certificates and monitoring trading compliance is managed directly by NITI Aayog.",
      "3. The Commission for Air Quality Management (CAQM) is an executive advisory committee constituted under an administrative order of the Ministry of Power."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Environment (Protection) Act, 1986 / E-Waste (Management) Rules, 2022",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "E-Waste Rules 2022 introduce market-based EPR recycling credit trading system for registered producers."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "NITI Aayog",
        truth_key: "Central Pollution Control Board (CPCB) / MoEFCC",
        anchor: "Centralized EPR portal and compliance enforcement is vested in CPCB under MoEFCC, NOT NITI Aayog."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Executive advisory committee under Ministry of Power",
        truth_key: "Tier-2 Statutory Commission established by an Act of Parliament (CAQM Act, 2021)",
        anchor: "CAQM is a statutory body created by the Commission for Air Quality Management in NCR Act, 2021, NOT an executive advisory panel."
      }
    ]
  },
  CHAIN_03_DEFENSE_EXPORT_SURGE: {
    stem: "With reference to the Defense Indigenization and Defense Acquisition Procedure (DAP) architecture, consider the following statements:",
    statements: [
      "1. Under the Positive Indigenization Lists notified by the Ministry of Defense, embargoes are placed on the import of designated defense systems to promote domestic manufacturing.",
      "2. The issuance of industrial licenses for manufacturing defense aircraft, warships, and specialized combat equipment is regulated exclusively by the Ministry of Defense.",
      "3. The Society of Indian Defense Manufacturers (SIDM) is a statutory authority established by an Act of Parliament to set mandatory defense export quotas."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Industries (Development & Regulation) Act, 1951 / DAP Guidelines",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "Defense Ministry notifications enforce progressive import bans across 500+ defense hardware items."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "Ministry of Defense",
        truth_key: "Department for Promotion of Industry and Internal Trade (DPIIT) / Ministry of Commerce",
        anchor: "Defense industrial licensing is administered by DPIIT under IDRA 1951, in consultation with MoD."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Tier-2 Statutory Authority established by Parliament",
        truth_key: "Tier-4 Apex Industry Association / Registered Society (non-statutory)",
        anchor: "SIDM is a non-governmental apex defense industry body, NOT a statutory commission created by Parliament."
      }
    ]
  }
};
