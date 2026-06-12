// stores/candidateDrawer.ts
import { create } from 'zustand';

interface CandidateDrawerStore {
  selectedCandidateId: number | null;
  openCandidate: (id: number) => void;
  closeCandidate: () => void;
}

export const useCandidateDrawer = create<CandidateDrawerStore>((set) => ({
  selectedCandidateId: null,

  openCandidate: (id) =>
    set({
      selectedCandidateId: id,
    }),

  closeCandidate: () =>
    set({
      selectedCandidateId: null,
    }),
}));