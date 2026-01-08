import { create } from 'zustand';
import { Draft } from '../../domain/entities/Draft';
import { DraftRepositoryImpl } from '../../data/repositories/DraftRepositoryImpl';

interface DraftState {
  drafts: Draft[];
  isLoading: boolean;
  error: string | null;
  selectedDraft: Draft | null;

  // Actions
  fetchDrafts: (userId: string) => Promise<void>;
  createDraft: (
    draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>
  ) => Promise<Draft>;
  updateDraft: (draftId: string, updates: Partial<Draft>) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  selectDraft: (draft: Draft | null) => void;
  clearError: () => void;
}

const repository = new DraftRepositoryImpl();

export const useDraftStore = create<DraftState>((set, get) => ({
  drafts: [],
  isLoading: false,
  error: null,
  selectedDraft: null,

  fetchDrafts: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const drafts = await repository.getDrafts(userId);
      set({ drafts, isLoading: false });
    } catch (error: any) {
      console.error('[DraftStore] Error fetching drafts:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  createDraft: async (draft) => {
    set({ isLoading: true, error: null });

    try {
      const newDraft = await repository.createDraft(draft);
      set((state) => ({
        drafts: [newDraft, ...state.drafts],
        isLoading: false,
      }));
      return newDraft;
    } catch (error: any) {
      console.error('[DraftStore] Error creating draft:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateDraft: async (draftId: string, updates: Partial<Draft>) => {
    try {
      const updatedDraft = await repository.updateDraft(draftId, updates);
      set((state) => ({
        drafts: state.drafts.map((d) => (d.id === draftId ? updatedDraft : d)),
      }));
    } catch (error: any) {
      console.error('[DraftStore] Error updating draft:', error);
      set({ error: error.message });
      throw error;
    }
  },

  deleteDraft: async (draftId: string) => {
    try {
      const success = await repository.deleteDraft(draftId);
      if (success) {
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== draftId),
        }));
      }
    } catch (error: any) {
      console.error('[DraftStore] Error deleting draft:', error);
      set({ error: error.message });
      throw error;
    }
  },

  selectDraft: (draft: Draft | null) => {
    set({ selectedDraft: draft });
  },

  clearError: () => set({ error: null }),
}));
