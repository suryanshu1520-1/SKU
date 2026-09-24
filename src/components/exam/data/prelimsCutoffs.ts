/**
 * Official UPSC CSE Preliminary Examination cut-offs: GS Paper I, out of 200 marks
 * ("Cut off marks on the basis of GS Paper-I only").
 * Verified by the Orchestrator against UPSC's own PDFs on 2026-09-24. EWS did not
 * exist before 2019. Do not add or change a value without a new source check.
 */
export interface PrelimsCutoff {
  year: number;
  general: number;
  ews: number | null;
  obc: number;
  sc: number;
  st: number;
  source: string;
}

export const PRELIMS_CUTOFFS: readonly PrelimsCutoff[] = [
  { year: 2025, general: 92.66, ews: 89.34, obc: 92.0, sc: 84.0, st: 82.66, source: 'https://www.upsc.gov.in/sites/default/files/CSE_2025_Cut-OffMks_Eng_09032026.pdf' },
  { year: 2024, general: 87.98, ews: 85.92, obc: 87.28, sc: 79.03, st: 74.23, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-2024-Engl-220425.pdf' },
  { year: 2023, general: 75.41, ews: 68.02, obc: 74.75, sc: 59.25, st: 47.82, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-23-engl-180424.pdf' },
  { year: 2022, general: 88.22, ews: 82.83, obc: 87.54, sc: 74.08, st: 69.35, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-22-Engl-230523.pdf' },
  { year: 2021, general: 87.54, ews: 80.14, obc: 84.85, sc: 75.41, st: 70.71, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-21-engl-300522.pdf' },
  { year: 2020, general: 92.51, ews: 77.55, obc: 89.12, sc: 74.84, st: 68.71, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-20-engl-270921.pdf' },
  { year: 2019, general: 98.0, ews: 90.0, obc: 95.34, sc: 82.0, st: 77.34, source: 'https://www.upsc.gov.in/sites/default/files/Cut_Off_Marks_CS2019_Eng.pdf' },
  { year: 2018, general: 98.0, ews: null, obc: 96.66, sc: 84.0, st: 83.34, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-2018-Engl-R.pdf' },
  { year: 2017, general: 105.34, ews: null, obc: 102.66, sc: 88.66, st: 88.66, source: 'https://www.upsc.gov.in/sites/default/files/Cutoff-CSE-2017-Engl.pdf' },
];
