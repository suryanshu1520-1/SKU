/**
 * src/types/humanities.ts
 *
 * Types for canonical humanities thinkers and passages with PYQ citations.
 */

export interface PyqCitation {
  year: number;
  paper: string;
  note?: string;
}

export interface Passage {
  id: string;
  text: string;
  isPlaceholder: boolean;
  pyqCitations: PyqCitation[];
}

export interface Thinker {
  id: string;
  name: string;
  workTitle: string;
  year: number;
  publicDomainBasis: string;
  passages: Passage[];
}

export interface HumanitiesCanon {
  thinkers: Thinker[];
}
