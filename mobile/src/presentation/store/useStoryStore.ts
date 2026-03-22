import { create } from 'zustand';

interface StoryStoreState {
  viewedUserIds: Set<string>;
  refreshTrigger: number;
  markUserAsViewed: (userId: string) => void;
  isUserViewed: (userId: string) => boolean;
  triggerRefresh: () => void;
}

export const useStoryStore = create<StoryStoreState>((set, get) => ({
  viewedUserIds: new Set(),
  refreshTrigger: 0,
  markUserAsViewed: (userId) => {
    set((state) => {
      if (state.viewedUserIds.has(userId)) return state;
      const newSet = new Set(state.viewedUserIds);
      newSet.add(userId);
      return { viewedUserIds: newSet };
    });
  },
  isUserViewed: (userId) => get().viewedUserIds.has(userId),
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));
