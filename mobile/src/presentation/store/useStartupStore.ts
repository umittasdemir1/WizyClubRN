import { create } from 'zustand';

interface StartupState {
  isStartupComplete: boolean;
  markStartupComplete: () => void;
}

export const useStartupStore = create<StartupState>((set, get) => ({
  isStartupComplete: false,
  markStartupComplete: () => {
    if (!get().isStartupComplete) {
      console.log('[Startup] ✅ Prefetch allowed');
      set({ isStartupComplete: true });
    }
  },
}));

// 3 saniye sonra otomatik tamamla
let timer: ReturnType<typeof setTimeout> | null = null;
export const initStartupTimer = () => {
  if (!timer) {
    timer = setTimeout(() => {
      useStartupStore.getState().markStartupComplete();
    }, 3000);
  }
};
