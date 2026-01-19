import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
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
    // Önceden yüklenecek video index'leri
    preloadIndices: number[];

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
    setPreloadIndices: (indices: number[]) => void;
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
    preloadIndices: [],

    setActiveVideo: (id, index) => {
        // Preload hesapla: Sonraki 2 ve önceki 1 video
        const preloadIndices: number[] = [];
        if (index > 0) preloadIndices.push(index - 1);
        preloadIndices.push(index + 1);
        preloadIndices.push(index + 2);

        set({
            activeVideoId: id,
            activeIndex: index,
            preloadIndices,
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

    setPreloadIndices: (indices) => set({ preloadIndices: indices }),
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
        console.log(`[Position] 💾 Saved: ${videoId} at ${position.toFixed(1)}s`);
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
// 🚀 VIDEO PRELOADER HOOK
// ===================================
// Scroll yönüne göre sonraki videoları önceden yükler.

interface Video {
    id: string;
    videoUrl: any;
    thumbnailUrl: string;
}

export function useVideoPreloader(
    videos: Video[],
    currentIndex: number,
    preloadCount: number = 2
) {
    const setPreloadIndices = useActiveVideoStore((state) => state.setPreloadIndices);
    const preloadIndices = useActiveVideoStore((state) => state.preloadIndices);
    const previousIndex = useRef(currentIndex);

    useEffect(() => {
        if (videos.length === 0) return;

        const indicesToPreload: number[] = [];
        const scrollDirection = currentIndex > previousIndex.current ? 'down' : 'up';
        previousIndex.current = currentIndex;

        if (scrollDirection === 'down') {
            // Aşağı kaydırıyorsa: Sonraki videoları preload et
            for (let i = 1; i <= preloadCount; i++) {
                const nextIndex = currentIndex + i;
                if (nextIndex < videos.length) {
                    indicesToPreload.push(nextIndex);
                }
            }
        } else {
            // Yukarı kaydırıyorsa: Önceki videoları preload et
            for (let i = 1; i <= preloadCount; i++) {
                const prevIndex = currentIndex - i;
                if (prevIndex >= 0) {
                    indicesToPreload.push(prevIndex);
                }
            }
        }

        // Her zaman bir önceki ve sonrakini de ekle
        if (currentIndex > 0 && !indicesToPreload.includes(currentIndex - 1)) {
            indicesToPreload.push(currentIndex - 1);
        }
        if (currentIndex < videos.length - 1 && !indicesToPreload.includes(currentIndex + 1)) {
            indicesToPreload.push(currentIndex + 1);
        }

        setPreloadIndices(indicesToPreload);

        // Debug log (development only)
        if (__DEV__) {
            console.log(`📹 Preload indices: [${indicesToPreload.join(', ')}]`);
        }
    }, [videos, currentIndex, preloadCount, setPreloadIndices]);

    return preloadIndices;
}

// ===================================
// 🎯 SHOULD VIDEO PLAY HOOK
// ===================================
// Bir videonun oynatılıp oynatılmayacağını belirler.

export function useShouldVideoPlay(videoId: string, videoIndex: number): boolean {
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const isScreenFocused = useActiveVideoStore((state) => state.isScreenFocused);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);

    // Video aktif, uygulama ön planda, ekran odaklı ve seek yapılmıyorsa oynat
    return activeVideoId === videoId && isAppActive && isScreenFocused && !isSeeking;
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

