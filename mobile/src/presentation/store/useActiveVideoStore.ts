import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
import { logVideo, LogCode } from '@/core/services/Logger';
// ===================================
// 🎬 GLOBAL ACTIVE VIDEO STORE
// ===================================
// TikTok benzeri uygulamalar için kritik bileşen.
// Tüm video bileşenleri bu store üzerinden yönetilir.

export interface ActiveVideoState {
    // Aktif video ID
    activeVideoId: string | null;
    // Aktif video index
    activeIndex: number;
    // Mute durumu
    isMuted: boolean;
    // App foreground durumu
    isAppActive: boolean;
    // Ignore app state transitions (e.g. native share sheet)
    ignoreAppState: boolean;
    // Screen focus status (Pause on blur)
    isScreenFocused: boolean;
    // Seek durumu (SeekBar'dan)
    isSeeking: boolean;
    // Pause durumu
    isPaused: boolean;
    // Temiz ekran modu
    isCleanScreen: boolean;
    // Video oynatma hızı
    playbackRate: number;
    // İzleme modu
    viewingMode: 'off' | 'fast' | 'full';
    // Özel feed (Grid'den gelince)
    customFeed: any[] | null;

    // Actions
    setActiveVideo: (id: string | null, index: number) => void;
    setMuted: (muted: boolean) => void;
    toggleMute: () => void;
    setAppActive: (active: boolean) => void;
    setIgnoreAppState: (ignore: boolean) => void;
    setScreenFocused: (focused: boolean) => void;
    setSeeking: (seeking: boolean) => void;
    togglePause: () => void;
    setPaused: (paused: boolean) => void;
    setCleanScreen: (clean: boolean) => void;
    setPlaybackRate: (rate: number) => void;
    setViewingMode: (mode: 'off' | 'fast' | 'full') => void;
    setCustomFeed: (videos: any[] | null) => void;
}

export const useActiveVideoStore = create<ActiveVideoState>((set, get) => ({
    activeVideoId: null,
    activeIndex: 0,
    isMuted: false,
    isAppActive: true,
    ignoreAppState: false,
    isScreenFocused: true,
    isSeeking: false,
    isPaused: false,
    isCleanScreen: false,
    playbackRate: 1.0,
    viewingMode: 'off',
    customFeed: null,

    setActiveVideo: (id, index) => {
        set({
            activeVideoId: id,
            activeIndex: index,
            isPaused: false, // Yeni video başladığında pause'u kaldır
        });
    },

    setMuted: (muted) => set({ isMuted: muted }),

    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

    setAppActive: (active) => set({ isAppActive: active }),
    setIgnoreAppState: (ignore) => set({ ignoreAppState: ignore }),
    setScreenFocused: (focused) => set({ isScreenFocused: focused }),

    setSeeking: (seeking) => set({ isSeeking: seeking }),

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    setPaused: (paused) => set({ isPaused: paused }),

    setCleanScreen: (clean) => set({ isCleanScreen: clean }),

    setPlaybackRate: (rate) => {
        const clamped = Math.max(0.5, Math.min(2.0, rate));
        set({ playbackRate: clamped });
    },

    setViewingMode: (mode) => set({ viewingMode: mode }),

    setCustomFeed: (videos) => set({ customFeed: videos }),
}));

// ===================================
// 🎬 VIDEO POSITION MEMORY
// ===================================
// Remember playback position when scrolling away
const videoPositions = new Map<string, number>();

export function saveVideoPosition(videoId: string, position: number) {
    // Only save if position is meaningful (> 0.5 sec and not near end)
    if (position > 0.5) {
        videoPositions.set(videoId, position);
        logVideo(LogCode.VIDEO_POSITION_SAVED, 'Video position saved', { videoId, position: position.toFixed(1) });
    }
}

export function getVideoPosition(videoId: string): number {
    return videoPositions.get(videoId) || 0;
}

export function clearVideoPosition(videoId: string) {
    videoPositions.delete(videoId);
}

// ===================================
// 🔄 APP STATE HOOK
// ===================================
// App foreground/background durumunu takip eder.
// Video otomatik pause/resume için kullanılır.

export function useAppStateSync() {
    const setAppActive = useActiveVideoStore((state) => state.setAppActive);
    const appStateRef = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (useActiveVideoStore.getState().ignoreAppState) {
                appStateRef.current = nextAppState;
                return;
            }
            const isActive = nextAppState !== 'background';
            const wasActive = appStateRef.current !== 'background';

            if (isActive !== wasActive) {
                setAppActive(isActive);
            }

            appStateRef.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [setAppActive]);
}

// ===================================
// 🔊 MUTE CONTROLS HOOK
// ===================================
export function useMuteControls() {
    const isMuted = useActiveVideoStore((state) => state.isMuted);
    const toggleMute = useActiveVideoStore((state) => state.toggleMute);
    const setMuted = useActiveVideoStore((state) => state.setMuted);

    return { isMuted, toggleMute, setMuted };
}
