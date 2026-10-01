import React from 'react';
import CandidateDossierModal, { CandidateDossierModalProps } from './CandidateDossierModal';

export interface PublicProfileProps extends CandidateDossierModalProps {}

/**
 * PublicProfile (Analyst / Candidate Dossier)
 * Canonical Tark analytical inspection modal.
 */
export default function PublicProfile(props: PublicProfileProps) {
  return <CandidateDossierModal {...props} />;
}

export { CandidateDossierModal };