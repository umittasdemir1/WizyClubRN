import { create } from 'zustand';

interface BrightnessState {
    brightness: number; // 0.0 (darkest) to 1.0 (brightest/normal)
    isControllerVisible: boolean;
    setBrightness: (value: number) => void;
    toggleController: () => void;
    hideController: () => void;
}

export const useBrightnessStore = create<BrightnessState>((set) => ({
    brightness: 1.0, // Default: full brightness (no overlay)
    isControllerVisible: false,

    setBrightness: (value: number) => {
        // Clamp between 0.2 (min - not completely black) and 1.0 (max)
        const clampedValue = Math.max(0.2, Math.min(1.0, value));
        set({ brightness: clampedValue });
    },

    toggleController: () => {
        set((state) => ({ isControllerVisible: !state.isControllerVisible }));
    },

    hideController: () => {
        set({ isControllerVisible: false });
    },
}));
