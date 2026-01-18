import { create } from 'zustand';
import { Story } from '../../domain/entities/Story';

interface StoryCacheState {
  stories: Story[];
  updatedAt: number | null;
  setStories: (stories: Story[]) => void;
}

export const useStoryCacheStore = create<StoryCacheState>((set) => ({
  stories: [],
  updatedAt: null,
  setStories: (stories) => {
    set({ stories, updatedAt: Date.now() });
  }
}));
